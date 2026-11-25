// <nowiki>
( function ( AFCH, $, mw ) {
	if ( typeof inUnitTestEnvironment === 'undefined' ) {
		if ( mw.config.get( 'wgArticleId' ) === 0 ||
			mw.config.get( 'wgPageContentModel' ) !== 'wikitext' ) {
			return;
		}
	}

	AFCH.addSignature = function ( text ) {
		text = text.trim();
		if ( text.indexOf( '~~~~' ) === -1 ) {
			text += ' ~~~~';
		}
		return text;
	};

	/**
	 * Represents an AfC submission -- its status as well as comments.
	 * Call submission.parse() to actually run the parsing process and fill
	 * the object with useful data.
	 *
	 * @param {AFCH.Page} page The submission page
	 */
	AFCH.Submission = function ( page ) {
		// The associated page
		this.page = page;

		this.shortTitle = this.page.title.getMainText();
		if ( [ /* User: */ 2, /* Wikipedia talk: */ 5 ].indexOf( this.page.title.getNamespaceId() ) !== -1 ) {
			// We need to strip the first path component (part before first slash) from
			// titles in the User or Wikipedia talk namespaces because those always have
			// an extra page level - being subpages of the user page or WT:Articles for
			// creation, respectively:
			// 'User:Example/Foo' => 'Foo'
			// 'WT:Articles for creation/Foo' => 'Foo'
			// 'User:Example/Intel 8231/8232' => 'Intel 8231/8232'
			this.shortTitle = this.shortTitle.replace( /.*?\//, '' );
		}

		this.resetVariables();
	};

	/**
	 * Resets variables and lists related to the submission state
	 */
	AFCH.Submission.prototype.resetVariables = function () {
		// Various submission states, set in parse()
		this.isPending = false;
		this.isUnderReview = false;
		this.isDeclined = false;
		this.isDraft = false;

		// Set in updateAttributesAfterParse()
		this.isCurrentlySubmitted = false;
		this.hasAfcTemplate = false;

		// All parameters on the page, zipped up into one
		// pretty package. The most recent value for any given
		// parameter (based on `ts`) takes precedent.
		this.params = {};

		// Holds all of the {{afc submission}} templates that still
		// apply to the page
		this.templates = [];

		// Holds all comments on the page
		this.comments = [];

		// Holds all submitters currently displayed on the page
		// (indicated by the `u` {{afc submission}} parameter)
		this.submitters = [];
	};

	/**
	 * Parses a submission, writing its current status and data to various properties
	 *
	 * @return {jQuery.Deferred} Resolves with the submission when parsed successfully
	 */
	AFCH.Submission.prototype.parse = function () {
		const sub = this,
			deferred = $.Deferred();

		this.page.getTemplates().done( ( templates ) => {
			sub.loadDataFromTemplates( templates );
			sub.sortAndParseInternalData();
			deferred.resolve( sub );
		} );

		return deferred;
	};

	/**
	 * @internal
	 * @param {Array<Object>} templates list of templates to parse
	 * @return {Array<Object>} [ this.templates, this.comments ]
	 */
	AFCH.Submission.prototype.loadDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		const submissionTemplates = [],
			commentTemplates = [];

		$.each( templates, ( _, template ) => {
			const name = template.target.toLowerCase();
			if ( name === 'afc submission' || name === 'afc submission/draft' ) {
				submissionTemplates.push( {
					status: ( AFCH.getAndDelete( template.params, '1' ) || '' ).toLowerCase(),
					timestamp: AFCH.getAndDelete( template.params, 'ts' ) || '',
					params: template.params
				} );
			} else if ( name === 'afc comment' ) {
				commentTemplates.push( {
					// If we can't find a timestamp, set it to unicorns, because everyone
					// knows that unicorns always come first.
					timestamp: AFCH.parseForTimestamp( template.params[ '1' ], /* mwstyle */ true ) || 'unicorns',
					text: template.params[ '1' ]
				} );
			}
		} );

		this.templates = submissionTemplates;
		this.comments = commentTemplates;

		// Return these for unit testing
		return [ this.templates, this.comments ];
	};

	/**
	 * Sort the internal lists of AfC submission and Afc comment templates
	 */
	AFCH.Submission.prototype.sortAndParseInternalData = function () {
		let sub = this,
			submissionTemplates = this.templates,
			commentTemplates = this.comments;

		function timestampSortHelper( a, b ) {
			// If we're passed something that's not a number --
			// for example, {{REVISIONTIMESTAMP}} -- just sort it
			// first and be done with it.
			if ( isNaN( a.timestamp ) ) {
				return -1;
			} else if ( isNaN( b.timestamp ) ) {
				return 1;
			}

			// Otherwise just sort normally
			return +b.timestamp - +a.timestamp;
		}

		// Sort templates by timestamp; most recent are first
		submissionTemplates.sort( timestampSortHelper );
		commentTemplates.sort( timestampSortHelper );

		// Reset variables related to the submisson state before re-parsing
		this.resetVariables();

		// Useful list of "what to do" in each situation.
		const statusCases = {
			// Declined
			d: function () {
				if ( !sub.isPending && !sub.isDraft && !sub.isUnderReview ) {
					sub.isDeclined = true;
				}
				return true;
			},
			// Draft
			t: function () {
				// If it's been submitted or declined, remove draft tag
				if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
					return false;
				}
				sub.isDraft = true;
				return true;
			},
			// Under review
			r: function () {
				if ( !sub.isPending && !sub.isDeclined ) {
					sub.isUnderReview = true;
				}
				return true;
			},
			// Pending
			'': function () {
				// Remove duplicate pending templates or a redundant
				// pending template when the submission has already been
				// declined / is already under review
				if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
					return false;
				}
				sub.isPending = true;
				sub.isDraft = false;
				sub.isUnderReview = false;
				return true;
			}
		};

		// Process the submission templates in order, from the most recent to
		// the oldest. In the process, we remove unneeded templates (for example,
		// a draft tag when it's already been submitted) and also set various
		// "isX" properties of the Submission.
		submissionTemplates = $.grep( submissionTemplates, ( template ) => {
			let keepTemplate = true;

			if ( statusCases[ template.status ] ) {
				keepTemplate = statusCases[ template.status ]();
			} else {
				// Default pending status
				keepTemplate = statusCases[ '' ]();
			}

			// If we're going to be keeping this template on the page,
			// save the parameter and submitter data. When saving params,
			// don't overwrite parameters that are already set, because
			// we're going newest to oldest (i.e. save most recent only).
			if ( keepTemplate ) {
				// Save parameter data
				sub.params = $.extend( {}, template.params, sub.params );

				// Save submitter if not already listed
				if ( template.params.u && sub.submitters.indexOf( template.params.u ) === -1 ) {
					sub.submitters.push( template.params.u );
				}

				// Will be re-added in makeWikicode() if necessary
				delete template.params.small; // small=yes for old declines
			}

			return keepTemplate;
		} );

		this.isCurrentlySubmitted = this.isPending || this.isUnderReview;
		this.hasAfcTemplate = !!submissionTemplates.length;

		this.templates = submissionTemplates;
		this.comments = commentTemplates;
	};

	/**
	 * Converts all the data to a hunk of wikicode
	 *
	 * @return {string}
	 */
	AFCH.Submission.prototype.makeWikicode = function () {
		let output = [],
			hasDeclineTemplate = false;

		// Submission templates go first
		$.each( this.templates, ( _, template ) => {
			let tout = '{{AfC submission|' + template.status,
				paramKeys = [];

			// FIXME: Think about if we really want this elaborate-ish
			// positional parameter ouput, or if it would be a better
			// idea to just make everything absolute. When we get to a point
			// where nobody is using the actual templates and it's 100%
			// script-based, "pretty" isn't really that important and we
			// can scrap this. Until then, though, we can only dream...

			// Make an array of the parameters
			$.each( template.params, ( key, value ) => {
				// Parameters set to false are ignored
				if ( value !== false ) {
					paramKeys.push( key );
				}
			} );

			paramKeys.sort( ( a, b ) => {
				const aIsNumber = !isNaN( a ),
					bIsNumber = !isNaN( b );

				// If we're passed two numerical parameters then
				// sort them in order (1,2,3)
				if ( aIsNumber && bIsNumber ) {
					return ( +a ) > ( +b ) ? 1 : -1;
				}

				// A is a number, it goes first
				if ( aIsNumber && !bIsNumber ) {
					return -1;
				}

				// B is a number, it goes first
				if ( !aIsNumber && bIsNumber ) {
					return 1;
				}

				// Otherwise just leave the positions as they were
				return 0;
			} );

			$.each( paramKeys, ( index, key ) => {
				const value = template.params[ key ];
				// If it is a numerical parameter, doesn't include
				// `=` in the value, AND is in sequence with the other
				// numerical parameters, we can omit the key= part
				// (positional parameters, joyous day :/ )
				if ( key == +key && +key % 1 === 0 &&
					value.indexOf( '=' ) === -1 &&
					// Parameter 2 will be the first positional parameter,
					// since 1 is always going to be the submission status.
					( key === '2' || paramKeys[ index - 1 ] == +key - 1 ) ) {
					tout += '|' + value;
				} else {
					tout += '|' + key + '=' + value;
				}
			} );

			// Collapse old decline template if a newer decline
			// template is already displayed on the page
			if ( hasDeclineTemplate && template.status === 'd' ) {
				tout += '|small=yes';
			}

			// So that subsequent decline templates will be collapsed
			if ( template.status === 'd' ) {
				hasDeclineTemplate = true;
			}

			// Finally, add the timestamp and a warning about removing the template
			tout += '|ts=' + template.timestamp + '}} <!-- Do not remove this line! -->';

			output.push( tout );
		} );

		// Then comment templates
		$.each( this.comments, ( _, comment ) => {
			output.push( '\n{{AfC comment|1=' + comment.text + '}}' );
		} );

		// If there were comments, add a horizontal rule beneath them
		if ( this.comments.length ) {
			output.push( '\n----' );
		}

		return output.join( '\n' );
	};

	/**
	 * Checks if submission is G13 eligible
	 *
	 * @return {jQuery.Deferred} Resolves to bool if submission is eligible
	 */
	AFCH.Submission.prototype.isG13Eligible = function () {
		const deferred = $.Deferred();

		// Submission must not currently be submitted
		if ( this.isCurrentlySubmitted ) {
			return deferred.resolve( false );
		}

		// Userspace drafts must have
		// one or more AfC submission templates to be eligible
		if ( this.page.title.getNamespaceId() == 2 &&
			this.templates.length === 0 ) {
			return deferred.resolve( false );
		}

		// And not have been modified in 6 months
		// FIXME: Ignore bot edits?
		this.page.getLastModifiedDate().done( ( lastEdited ) => {
			const timeNow = new Date(),
				sixMonthsAgo = new Date();

			sixMonthsAgo.setMonth( timeNow.getMonth() - 6 );

			deferred.resolve( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) );
		} );

		return deferred;
	};

	/**
	 * Sets the submission status
	 *
	 * @param {string} newStatus status to set, 'd'|'t'|'r'|''
	 * @param {Object} newParams optional; params to add to the template whose status was set
	 * @return {boolean} success
	 */
	AFCH.Submission.prototype.setStatus = function ( newStatus, newParams ) {
		const relevantTemplate = this.templates[ 0 ];

		if ( [ 'd', 't', 'r', '' ].indexOf( newStatus ) === -1 ) {
			// Unrecognized status
			return false;
		}

		if ( !newParams ) {
			newParams = {};
		}

		// If there are no templates on the page, just generate a new one
		// (addNewTemplate handles the reparsing)
		if ( !relevantTemplate ||
			// Same for if the top template on the stack is already declined;
			// we don't want to overwrite it
			relevantTemplate.status === 'd' ) {
			this.addNewTemplate( {
				status: newStatus,
				params: newParams
			} );
		} else {
			// Just modify the template at the top of the stack
			relevantTemplate.status = newStatus;
			relevantTemplate.params.ns = mw.config.get( 'wgNamespaceNumber' );

			// Add new parameters if specified
			$.extend( relevantTemplate.params, newParams );

			// And finally reparse
			this.sortAndParseInternalData();
		}

		return true;
	};

	/**
	 * Add a new template to the beginning of this.templates
	 *
	 * @param {Object} data object with properties of template
	 *                      - status (default: '')
	 *                      - timestamp (default: '{{subst:REVISIONTIMESTAMP}}')
	 *                      - params (default: {})
	 */
	AFCH.Submission.prototype.addNewTemplate = function ( data ) {
		this.templates.unshift( $.extend( /* deep */ true, {
			status: '',
			timestamp: '{{subst:REVISIONTIMESTAMP}}',
			params: {
				ns: mw.config.get( 'wgNamespaceNumber' )
			}
		}, data ) );

		// Reparse :P
		this.sortAndParseInternalData();
	};

	/**
	 * Add a new comment to the beginning of this.comments
	 *
	 * @param {string} text comment text
	 * @return {boolean} success
	 */
	AFCH.Submission.prototype.addNewComment = function ( text ) {
		const commentText = AFCH.addSignature( text );

		this.comments.unshift( {
			// Unicorns are explained in loadDataFromTemplates()
			timestamp: AFCH.parseForTimestamp( commentText, /* mwstyle */ true ) || 'unicorns',
			text: commentText
		} );

		// Reparse :P
		this.sortAndParseInternalData();

		return true;
	};

	/**
	 * Gets the submitter, or, if no specific submitter is available,
	 * just the page creator
	 *
	 * @return {jQuery.Deferred} resolves with user
	 */
	AFCH.Submission.prototype.getSubmitter = function () {
		const deferred = $.Deferred(),
			user = this.params.u;

		// Recursively detect if the user has been renamed by checking the rename log
		if ( user ) {
			AFCH.api.get( {
				action: 'query',
				list: 'logevents',
				formatversion: 2,
				letype: 'renameuser',
				lelimit: 1,
				letitle: 'User:' + user
			} ).then( ( resp ) => {
				const logevents = resp.query.logevents;

				if ( logevents.length ) {
					const newName = logevents[ 0 ].params.newuser;
					this.params.u = newName;
					this.getSubmitter().then( ( user ) => {
						deferred.resolve( user );
					} );
				} else {
					deferred.resolve( user );
				}
			} );
		} else {
			this.page.getCreator().done( ( user ) => {
				deferred.resolve( user );
			} );
		}

		return deferred;
	};

	/**
	 * Represents text of an AfC submission
	 *
	 * @param {string} text
	 */
	AFCH.Text = function ( text ) {
		this.text = text;
	};

	AFCH.Text.prototype.get = function () {
		return this.text;
	};

	AFCH.Text.prototype.set = function ( string ) {
		this.text = string;
		return this.text;
	};

	AFCH.Text.prototype.prepend = function ( string ) {
		this.text = string + this.text;
		return this.text;
	};

	AFCH.Text.prototype.append = function ( string ) {
		this.text += string;
		return this.text;
	};

	AFCH.Text.prototype.cleanUp = function ( isAccept ) {
		let text = this.text;
		const commentsToRemove = [
			'Please don\'t change anything and press save',
			'Carry on from here, and delete this comment.',
			'Please leave this line alone!',
			'Just press the "Save page" button below without changing anything! Doing so will submit your article submission for review. ' +
				'Once you have saved this page you will find a new yellow \'Review waiting\' box at the bottom of your submission page. ' +
				'If you have submitted your page previously,(?: either)? the old pink \'Submission declined\' template or the old grey ' +
				'\'Draft\' template will still appear at the top of your submission page, but you should ignore (them|it). Again, please ' +
				'don\'t change anything in this text box. Just press the "Save page" button below.'
		];

		if ( isAccept ) {
			// Remove {{Draft categories}}
			text = text.replace( /\{\{(?:Draft categories|Draftcat)\s*\|((?:\s*\[\[:?Category:[ \S]+?\]\]\s*)*)\s*\}\}/gi, '$1' );

			// Remove {{Draft article}} (and {{Draft}}).
			// Not removed if the |text= parameter is present, which could contain
			// arbitrary wikitext and therefore makes the end of the template harder
			// to detect
			text = text.replace( /\{\{Draft(?!\|\s*text\s*=)(?: article(?!\|\s*text\s*=)(?:\|(?:subject=)?[^|]+)?|\|(?:subject=)?[^|]+)?\}\}/gi, '' );

			// Uncomment cats and templates
			text = text.replace( /\[\[:Category:/gi, '[[Category:' );
			text = text.replace( /\{\{(tl|tlx|tlg)\|(.*?)\}\}/ig, '{{$2}}' );

			const templatesToRemove = [
				'AfC postpone G13',
				'Draft topics',
				'AfC topic',
				'Drafts moved from mainspace',
				'Promising draft'
			];

			templatesToRemove.forEach( ( template ) => {
				text = text.replace( new RegExp( '\\{\\{' + template + '\\s*\\|?(.*?)\\}\\}\\n?', 'gi' ), '' );
			} );

			// Add to the list of comments to remove
			commentsToRemove.push(
				'Enter template purpose and instructions here.',
				'Enter the content and\\/or code of the template here.',
				'EDIT BELOW THIS LINE',
				'Metadata: see \\[\\[Wikipedia:Persondata\\]\\].',
				'See http://en.wikipedia.org/wiki/Wikipedia:Footnotes on how to create references using\\<ref\\>\\<\\/ref\\> tags, these references will then appear here automatically',
				'(After listing your sources please cite them using inline citations and place them after the information they cite.|Inline citations added to your article will automatically display here.) ' +
					'(Please see|See) ((https?://)?en.wikipedia.org/wiki/(Wikipedia|WP):REFB|\\[\\[Wikipedia:REFB\\]\\]) for instructions on how to add citations.',
				'Important, do not remove this line before (template|article) has been created.',
				'Important, do not remove anything above this line before (template|article) has been created.',
				'Do not remove this line!'
			);
		} else {
			// We want to disable categories, except categories inside of the template {{Draft categories}}, by adding a colon to the beginning of the wikilink.
			// Replace {{Draft categories}} with a placeholder.
			const protectedDraftCategories = [];
			text = text.replace( /\{\{(?:Draft categories|Draftcat)\b[\s\S]*?\}\}(?:\r?\n)?/gi, ( match ) => {
				const hasTrailingNewline = /\r?\n$/.test( match ),
					hasInternalNewline = /\r?\n/.test( hasTrailingNewline ? match.slice( 0, -1 ) : match ),
					hasCategoryWithSpaces = /\[\[:?Category:[^\]\r\n]*\s+[^\]\r\n]*\]\]/i.test( match );

				if ( !( hasTrailingNewline || hasInternalNewline || hasCategoryWithSpaces ) ) {
					return match;
				}

				const placeholder = '__AFCH_DRAFT_CATS_' + protectedDraftCategories.length + '__';
				protectedDraftCategories.push( match );
				return placeholder;
			} );
			// Disable categories by adding a colon to the beginning of the wikilink.
			text = text.replace( /\[\[Category:/gi, '[[:Category:' );
			// Replace the placeholder with the original wikicode.
			protectedDraftCategories.forEach( ( draftCategories, index ) => {
				text = text.replace( '__AFCH_DRAFT_CATS_' + index + '__', draftCategories );
			} );
		}

		// Remove empty section at the end (caused by "Resubmit" button on "declined" template)
		// Section may have categories after it - keep them there
		text = AFCH.removeEmptySectionAtEnd( text );

		// Assemble a master regexp and remove all now-unneeded comments (commentsToRemove)
		const commentRegex = new RegExp( '<!-{2,}\\s*(' + commentsToRemove.join( '|' ) + ')\\s*-{2,}>', 'gi' );
		text = text.replace( commentRegex, '' );

		// Remove initial request artifact
		text = text.replace( /== Request review at \[\[WP:AFC\]\] ==/gi, '' );

		// Remove sandbox templates
		text = text.replace( /\{\{(userspacedraft|userspace draft|user sandbox|Please leave this line alone \(sandbox heading\))(?:\{\{[^{}]*\}\}|[^}{])*\}\}/ig, '' );

		// Remove html comments (<!--) that surround categories
		text = text.replace( /<!--\s*((\[\[:{0,1}(Category:.*?)\]\]\s*)+)-->/gi, '$1' );

		// Remove spaces/commas between <ref> tags
		text = text.replace( /\s*(<\/\s*ref\s*>)\s*[,]*\s*(<\s*ref\s*(name\s*=|group\s*=)*\s*[^/]*>)[ \t]*$/gim, '$1$2' );

		// Remove whitespace before <ref> tags
		text = text.replace( /[ \t]*(<\s*ref\s*(name\s*=|group\s*=)*\s*.*[^/]+>)[ \t]*$/gim, '$1' );

		// Move punctuation before <ref> tags
		text = text.replace( /\s*((<\s*ref\s*(name\s*=|group\s*=)*\s*.*[/]{1}>)|(<\s*ref\s*(name\s*=|group\s*=)*\s*[^/]*>(?:<[^<>]*>|[^><])*<\/\s*ref\s*>))[ \t]*([.!?,;:])+$/gim, '$6$1' );

		// Replace {{http://example.com/foo}} with "* http://example.com/foo" (common newbie error)
		text = text.replace( /\n\{\{(http[s]?|ftp[s]?|irc|gopher|telnet):\/\/(.*?)\}\}/gi, '\n* $1://$3' );

		text = this.convertExternalLinksToWikilinks( text );

		this.text = text;
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Convert http://-style links to other wikipages to wikicode syntax
	 *
	 * @param {string} text
	 * @return {string}
	 */
	AFCH.Text.prototype.convertExternalLinksToWikilinks = function ( text ) {
		const linkRegex = /\[{1,2}(?:https?:)?\/\/(?:en.wikipedia.org\/wiki|enwp.org)\/([^\s|\][]+)(?:\s|\|)?((?:\[\[[^[\]]*\]\]|[^\][])*)\]{1,2}/ig;
		let linkMatch = linkRegex.exec( text ),
			title, displayTitle, newLink;

		while ( linkMatch ) {
			title = decodeURI( linkMatch[ 1 ] ).replace( /_/g, ' ' );
			displayTitle = decodeURI( linkMatch[ 2 ] ).replace( /_/g, ' ' );

			// Don't include the displayTitle if it is equal to the title
			if ( displayTitle && title !== displayTitle ) {
				newLink = '[[' + title + '|' + displayTitle + ']]';
			} else {
				newLink = '[[' + title + ']]';
			}

			text = text.replace( linkMatch[ 0 ], newLink );
			linkMatch = linkRegex.exec( text );
		}

		return text;
	};

	AFCH.Text.prototype.removeExcessNewlines = function () {
		// Replace 3+ newlines with just two
		this.text = this.text.replace( /(?:[\t ]*(?:\r?\n|\r)){3,}/ig, '\n\n' );
		// Remove all whitespace at the top of the article
		this.text = this.text.replace( /^\s*/, '' );
	};

	AFCH.Text.prototype.getAfcComments = function () {
		return this.text.match( /\{\{\s*afc comment[\s\S]+?\(UTC\)\}\}/gi );
	};

	AFCH.Text.prototype.removeAfcTemplates = function () {
		// FIXME: Awful regex to remove the old submission templates
		// This is bad. It works for most cases but has a hellish time
		// with some double nested templates or faux nested templates (for
		// example "{{hi|{ foo}}" -- note the extra bracket). Ideally Parsoid
		// would just return the raw template text as well (currently
		// working on a patch for that, actually).
		this.text = this.text.replace( new RegExp( '\\{\\{\\s*afc submission\\s*(?:\\||[^{{}}]*|{{.*?}})*?\\}\\}' +
			// Also remove the AFCH-generated warning message, since if necessary the script will add it again
			'( <!-- Do not remove this line! -->)?', 'gi' ), '' );

		// Nastiest hack of all time. As above, Parsoid would be great. Gotta wire it up asynchronously first, though.
		this.text = this.text.replace( /\{\{\s*afc comment[\s\S]+?\(UTC\)\}\}/gi, '' );

		// Remove horizontal rules that were added by AFCH after the comments
		this.text = this.text.replace( /^----+$/gm, '' );

		// Remove excess newlines created by AfC templates
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Removes old submission templates/comments and then adds new ones
	 * specified by `new`
	 *
	 * @param {string} newCode
	 * @return {string}
	 */
	AFCH.Text.prototype.updateAfcTemplates = function ( newCode ) {
		this.removeAfcTemplates();
		return this.prepend( newCode + '\n\n' );
	};

	AFCH.Text.prototype.updateCategories = function ( categories ) {
		// There's no "g" flag in categoryRegex, because we use it
		// to delete its matches in a loop. If it were global, then
		// it would internally keep track of lsatIndex - then given
		// two adjacent categories, only the first would get deleted
		let catIndex, match,
			text = this.text,
			categoryRegex = /\[\[:?Category:.*?\s*\]\]/i,
			newCategoryCode = '\n';

		// Create the wikicode block
		$.each( categories, ( _, category ) => {
			const trimmed = $.trim( category );
			if ( trimmed ) {
				newCategoryCode += '\n[[Category:' + trimmed + ']]';
			}
		} );

		match = categoryRegex.exec( text );

		// If there are no categories currently on the page,
		// just add the categories at the bottom
		if ( !match ) {
			text += newCategoryCode;
		// If there are categories on the page, remove them all, and
		// then add the new categories where the last category used to be
		} else {
			while ( match ) {
				catIndex = match.index;
				text = text.replace( match[ 0 ], '' );
				match = categoryRegex.exec( text );
			}

			text = text.substring( 0, catIndex ) + newCategoryCode + text.substring( catIndex );
		}

		this.text = text;
		return this.text;
	};

	AFCH.Text.prototype.updateShortDescription = function ( existingShortDescription, newShortDescription ) {
		const shortDescTemplateExists = /\{\{[Ss]hort ?desc(ription)?\s*\|/.test( this.text );
		const shortDescExists = !!existingShortDescription;

		if ( newShortDescription ) {
			// 1. No shortdesc - insert the one provided by user
			if ( !shortDescExists ) {
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 2. Shortdesc exists from {{short description}} template - replace it
			} else if ( shortDescExists && shortDescTemplateExists ) {
				this.text = this.text.replace( /\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '' );
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 3. Shortdesc exists, but not generated by {{short description}}. If the user
			//  has changed the value, save the new value
			} else if ( shortDescExists && existingShortDescription !== newShortDescription ) {
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 4. Shortdesc exists, but not generated by {{short description}}, and user hasn't changed the value
			} else {
				// Do nothing
			}
		} else {
			// User emptied the shortdesc field (or didn't exist from before): remove any existing shortdesc.
			// This doesn't remove any shortdesc that is generated by other templates
			this.text = this.text.replace( /\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '' );
		}
	};

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
