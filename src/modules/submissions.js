//<nowiki>
( function ( AFCH, $, mw ) {
	var $afchLaunchLink, $afch, $afchWrapper,
		afchPage, afchSubmission, afchViews, afchViewer;

	// Die if reviewing a nonexistent page or a userjs/css page
	if ( mw.config.get( 'wgArticleId' ) === 0 ||
		mw.config.get( 'wgPageContentModel' ) !== 'wikitext' ) {
		return;
	}

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

		// 'WT:Articles for creation/Foo' => 'Foo'
		this.shortTitle = this.page.title.getMainText().match( /([^\/]+)\/?$/ )[ 1 ];

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
	 * @return {$.Deferred} Resolves with the submission when parsed successfully
	 */
	AFCH.Submission.prototype.parse = function () {
		var sub = this,
			deferred = $.Deferred();

		this.page.getTemplates().done( function ( templates ) {
			sub.loadDataFromTemplates( templates );
			sub.sortAndParseInternalData();
			deferred.resolve( sub );
		} );

		return deferred;
	};

	/**
	 * Internal function
	 * @param {array} templates list of templates to parse
	 */
	AFCH.Submission.prototype.loadDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		var submissionTemplates = [],
			commentTemplates = [];

		$.each( templates, function ( _, template ) {
			var name = template.target.toLowerCase();
			if ( name === 'afc submission' ) {
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
	};

	/**
	 * Sort the internal lists of AFC submission and Afc comment templates
	 */
	AFCH.Submission.prototype.sortAndParseInternalData = function () {
		var sub = this,
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
		var statusCases = {
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
		submissionTemplates = $.grep( submissionTemplates, function ( template ) {
			var keepTemplate = true;

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
	 * @return {string}
	 */
	AFCH.Submission.prototype.makeWikicode = function () {
		var output = [],
			hasDeclineTemplate = false;

		// Submission templates go first
		$.each( this.templates, function ( _, template ) {
			var tout = '{{AFC submission|' + template.status,
				paramKeys = [];

			// FIXME: Think about if we really want this elaborate-ish
			// positional parameter ouput, or if it would be a better
			// idea to just make everything absolute. When we get to a point
			// where nobody is using the actual templates and it's 100%
			// script-based, "pretty" isn't really that important and we
			// can scrap this. Until then, though, we can only dream...

			// Make an array of the parameters
			$.each( template.params, function ( key, value ) {
				// Parameters set to false are ignored
				if ( value !== false ) {
					paramKeys.push( key );
				}
			} );

			paramKeys.sort( function ( a, b ) {
				var aIsNumber = !isNaN( a ),
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

			$.each( paramKeys, function ( index, key ) {
				var value = template.params[ key ];
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
		$.each( this.comments, function ( _, comment ) {
			output.push( '\n{{AFC comment|1=' + comment.text + '}}' );
		} );

		// If there were comments, add a horizontal rule beneath them
		if ( this.comments.length ) {
			output.push( '\n----' );
		}

		return output.join( '\n' );
	};

	/**
	 * Checks if submission is G13 eligible
	 * @return {$.Deferred} Resolves to bool if submission is eligible
	 */
	AFCH.Submission.prototype.isG13Eligible = function () {
		var deferred = $.Deferred();

		// Submission must not currently be submitted
		if ( this.isCurrentlySubmitted ) {
			return deferred.resolve( false );
		}

		// Userspace drafts and `Draft` namespace drafts must have
		// one or more AFC submission templates to be eligible
		if ( [ 2, 118 ].indexOf( this.page.title.getNamespaceId() ) !== -1 &&
			this.templates.length === 0 ) {
			return deferred.resolve( false );
		}

		// And not have been modified in 6 months
		// FIXME: Ignore bot edits?
		this.page.getLastModifiedDate().done( function ( lastEdited ) {
			var timeNow = new Date(),
				sixMonthsAgo = new Date();

			sixMonthsAgo.setMonth( timeNow.getMonth() - 6 );

			deferred.resolve( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) );
		} );

		return deferred;
	};

	/**
	 * Sets the submission status
	 * @param {string} newStatus status to set, 'd'|'t'|'r'|''
	 * @param {params} optional; params to add to the template whose status was set
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.setStatus = function ( newStatus, newParams ) {
		var relevantTemplate = this.templates[ 0 ];

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
	 * @param {object} data object with properties of template
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
	 * @param {string} text comment text
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.addNewComment = function ( text ) {
		var commentText = $.trim( text );

		if ( commentText.indexOf( '~~' + '~~' ) === -1 ) {
			commentText += ' ~~' + '~~';
		}

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
	 * @return {$.Deferred} resolves with user
	 */
	AFCH.Submission.prototype.getSubmitter = function () {
		var deferred = $.Deferred(),
			user = this.params.u;

		if ( user ) {
			deferred.resolve( user );
		} else {
			this.page.getCreator().done( function ( user ) {
				deferred.resolve( user );
			} );
		}

		return deferred;
	};

	/**
	 * Represents text of an AfC submission
	 * @param {[type]} text [description]
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
		var text = this.text,
			commentRegex,
			commentsToRemove = [
				'Please don\'t change anything and press save',
				'Carry on from here, and delete this comment.',
				'Please leave this line alone!',
				'Important, do not remove this line before (template|article) has been created.',
				'Just press the "Save page" button below without changing anything! Doing so will submit your article submission for review. ' +
					'Once you have saved this page you will find a new yellow \'Review waiting\' box at the bottom of your submission page. ' +
					'If you have submitted your page previously,(?: either)? the old pink \'Submission declined\' template or the old grey ' +
					'\'Draft\' template will still appear at the top of your submission page, but you should ignore (them|it). Again, please ' +
					'don\'t change anything in this text box. Just press the \"Save page\" button below.'
			];

		if ( isAccept ) {
			// Uncomment cats and templates
			text = text.replace( /\[\[:Category:/gi, '[[Category:' );
			text = text.replace( /\{\{(tl|tlx|tlg)\|(.*?)\}\}/ig, '{{$2}}' );

			// Strip the AFC G13 postponement template
			text = text.replace( /\{\{AfC postpone G13(?:\|\d*)?\}\}\n*/gi, '' );

			// Add to the list of comments to remove
			$.merge( commentsToRemove, [
				'Enter template purpose and instructions here.',
				'Enter the content and\\/or code of the template here.',
				'EDIT BELOW THIS LINE',
				'Metadata: see \\[\\[Wikipedia:Persondata\\]\\].',
				'See http://en.wikipedia.org/wiki/Wikipedia:Footnotes on how to create references using\\<ref\\>\\<\\/ref\\> tags, these references will then appear here automatically',
				'After listing your sources please cite them using inline citations and place them after the information they cite. ' +
					'Please see (https?://en.wikipedia.org/wiki/Wikipedia:REFB|\\[\\[Wikipedia:REFB\\]\\]) for instructions on how to add citations.'
			] );
		} else {
			// If not yet accepted, comment out cats
			text = text.replace( /\[\[Category:/gi, '[[:Category:' );
		}

		// Assemble a master regexp and remove all now-unneeded comments (commentsToRemove)
		commentRegex = new RegExp( '<!-{2,}\\s*(' + commentsToRemove.join( '|' ) + ')\\s*-{2,}>', 'gi' );
		text = text.replace( commentRegex, '' );

		// Remove initial request artifact
		text = text.replace( /== Request review at \[\[WP:AFC\]\] ==/gi, '' );

		// Remove sandbox templates
		text = text.replace( /\{\{(userspacedraft|userspace draft|user sandbox|Please leave this line alone \(sandbox heading\))(?:\{\{[^{}]*\}\}|[^}{])*\}\}/ig, '' );

		// Remove html comments (<!--) that surround categories
		text = text.replace( /<!--\s*((\[\[:{0,1}(Category:.*?)\]\]\s*)+)-->/gi, '$1' );

		// Remove spaces/commas between <ref> tags
		text = text.replace( /\s*(<\/\s*ref\s*\>)\s*[,]*\s*(<\s*ref\s*(name\s*=|group\s*=)*\s*[^\/]*>)[ \t]*$/gim, '$1$2' );

		// Remove whitespace before <ref> tags
		text = text.replace( /[ \t]*(<\s*ref\s*(name\s*=|group\s*=)*\s*.*[^\/]+>)[ \t]*$/gim, '$1' );

		// Move punctuation before <ref> tags
		text = text.replace( /\s*((<\s*ref\s*(name\s*=|group\s*=)*\s*.*[\/]{1}>)|(<\s*ref\s*(name\s*=|group\s*=)*\s*[^\/]*>(?:<[^<\>]*\>|[^><])*<\/\s*ref\s*\>))[ \t]*([.!?,;:])+$/gim, '$6$1' );

		// Replace {{http://example.com/foo}} with "* http://example.com/foo" (common newbie error)
		text = text.replace( /\n\{\{(http[s]?|ftp[s]?|irc|gopher|telnet)\:\/\/(.*?)\}\}/gi, '\n* $1://$3' );

		// Convert http://-style links to other wikipages to wikicode syntax
		// FIXME: Break this out into its own core function? Will it be used elsewhere?
		function convertExternalLinksToWikilinks( text ) {
			var linkRegex = /\[{1,2}(?:https?:)?\/\/(?:en.wikipedia.org\/wiki|enwp.org)\/([^\s\|\]\[]+)(?:\s|\|)?((?:\[\[[^\[\]]*\]\]|[^\]\[])*)\]{1,2}/ig,
				linkMatch = linkRegex.exec( text ),
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
		}

		text = convertExternalLinksToWikilinks( text );

		this.text = text;
		this.removeExcessNewlines();

		return this.text;
	};

	AFCH.Text.prototype.removeExcessNewlines = function () {
		// Replace 3+ newlines with just two
		this.text = this.text.replace( /(?:[\t ]*(?:\r?\n|\r)){3,}/ig, '\n\n' );
		// Remove all whitespace at the top of the article
		this.text = this.text.replace( /^\s*/, '' );
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
		this.text = this.text.replace( /\{\{\s*afc comment\s*(?:\||[^{{}}]*|{{.*?}})*?\}\}/gi, '' );

		// Remove horizontal rules that were added by AFCH after the comments
		this.text = this.text.replace( /^----+$/gm, '' );

		// Remove excess newlines created by AFC templates
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Removes old submission templates/comments and then adds new ones
	 * specified by `new`
	 * @param {string} new
	 */
	AFCH.Text.prototype.updateAfcTemplates = function ( newCode ) {
		this.removeAfcTemplates();
		return this.prepend( newCode + '\n\n' );
	};

	AFCH.Text.prototype.updateCategories = function ( categories ) {
		var catIndex, match,
			text = this.text,
			categoryRegex = /\[\[:?Category:.*?\s*\]\]/gi,
			newCategoryCode = '\n';

		// Create the wikicode block
		$.each( categories, function ( _, category ) {
			var trimmed = $.trim( category );
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

	// Add the launch link
	$afchLaunchLink = $( mw.util.addPortletLink( AFCH.prefs.launchLinkPosition, '#', 'Review (AFCH beta)',
		'afch-launch', 'Review submission using afch-rewrite', '1' ) );

	if ( AFCH.prefs.autoOpen &&
		// Don't autoload in userspace -- too many false positives
		AFCH.consts.pagename.indexOf( 'User:' ) !== 0 &&
		// Only autoload if viewing or editing the page
		[ 'view', 'edit', null ].indexOf( AFCH.getParam( 'action' ) ) !== -1 &&
		!AFCH.getParam( 'diff' ) && !AFCH.getParam( 'oldid' ) ) {
		// Launch the script immediately if preference set
		createAFCHInstance();
	} else {
		// Otherwise, wait for a click (`one` to prevent spawning multiple panels)
		$afchLaunchLink.one( 'click', createAFCHInstance );
	}

	// Mark launch link for the old helper script as "old" if present on page
	$( '#p-cactions #ca-afcHelper > a' ).append( ' (old)' );

	// If AFCH is destroyed via AFCH.destroy(),
	// remove the $afch window and the launch link
	AFCH.addDestroyFunction( function () {
		$afchLaunchLink.remove();

		// The $afch window might not exist yet; make
		// sure it does before trying to remove it :)
		if ( $afch && $afch.jquery ) {
			$afch.remove();
		}
	} );

	function createAFCHInstance() {
		/**
		 * global; wraps ALL afch-y things
		 */
		$afch = $( '<div>' )
			.addClass( 'afch' )
			.insertBefore( '#mw-content-text' )
			.append(
				$( '<div>' )
					.addClass( 'top-bar' )
					.append(
						// Back link appears on the left based on context
						$( '<div>' )
							.addClass( 'back-link' )
							.html( '&#x25c0; back to options' ) // back arrow
							.attr( 'title', 'Go back' )
							.addClass( 'hidden' )
							.click( function () {
								// Reload the review panel
								spinnerAndRun( setupReviewPanel );
							} ),

						// On the right, a close button
						$( '<div>' )
							.addClass( 'close-link' )
							.html( '&times;' )
							.click( function () {
								// DIE DIE DIE (...then allow clicks on the launch link again)
								$afch.remove();
								$afchLaunchLink
									.off( 'click' ) // Get rid of old handler
									.one( 'click', createAFCHInstance );
							} )
					)
			);

		/**
		 * global; wrapper for specific afch panels
		 */
		$afchWrapper = $( '<div>' )
			.addClass( 'panel-wrapper' )
			.appendTo( $afch )
			.append(
				// Build splash panel in JavaScript rather than via
				// a template so we don't have to wait for the
				// HTTP request to go through
				$( '<div>' )
					.addClass( 'review-panel' )
					.addClass( 'splash' )
					.append(
						$( '<div>' )
							.addClass( 'initial-header' )
							.text( 'Loading AFCH v' + AFCH.consts.version + '...' )
					)
			);

		// Now set up the review panel and replace it with actual content, not just a splash screen
		setupReviewPanel();

		// If the "Review" link is clicked again, just reload the main view
		$afchLaunchLink.click( function () {
			spinnerAndRun( setupReviewPanel );
		} );
	}

	function setupReviewPanel() {
		// Store this to a variable so we can wait for its success
		var loadViews = $.ajax( {
			type: 'GET',
			url: AFCH.consts.baseurl + '/tpl-submissions.js',
			dataType: 'text'
		} ).done( function ( data ) {
			afchViews = new AFCH.Views( data );
			afchViewer = new AFCH.Viewer( afchViews, $afchWrapper );
		} );

		afchPage = new AFCH.Page( AFCH.consts.pagename );
		afchSubmission = new AFCH.Submission( afchPage );

		// Set up messages for later
		setMessages();

		// Parse the page and load the view templates. When done,
		// continue with everything else.
		$.when(
			afchSubmission.parse(),
			loadViews
		).then( function ( submission ) {
			var extrasRevealed = false;

			// Render the base buttons view
			loadView( 'main', {
				title: submission.shortTitle,
				accept: submission.isCurrentlySubmitted,
				decline: submission.isCurrentlySubmitted,
				comment: true, // Comments are always okay!
				submit: !submission.isCurrentlySubmitted,
				alreadyUnderReview: submission.isUnderReview,
				version: AFCH.consts.version,
				versionName: AFCH.consts.versionName
			} );

			// Set up the extra options slide-out panel, which appears
			// when the user click on the chevron
			$afch.find( '#afchExtra .open' ).click( function () {
				var $extra = $afch.find( '#afchExtra' ),
					$toggle = $( this );

				if ( extrasRevealed ) {
					$extra.find( 'a' ).hide();
					$extra.stop().animate( { width: '20px' }, 100, 'swing', function () {
						extrasRevealed = false;
					} );
				} else {
					$extra.stop().animate( { width: '210px' }, 150, 'swing', function () {
						$extra.find( 'a' ).css( 'display', 'block' );
						extrasRevealed = true;
					} );
				}
			} );

			// Add feedback and preferences links
			// FIXME: Feedback temporarily disabled due to https://github.com/WPAFC/afch-rewrite/issues/71
			// AFCH.initFeedback( $afch.find( 'span.feedback-wrapper' ), '[your topic here]', 'give feedback' );
			AFCH.preferences.initLink( $afch.find( 'span.preferences-wrapper' ), 'preferences' );

			// Set up click handlers
			$afch.find( '#afchAccept' ).click( function () { spinnerAndRun( showAcceptOptions ); } );
			$afch.find( '#afchDecline' ).click( function () { spinnerAndRun( showDeclineOptions ); } );
			$afch.find( '#afchComment' ).click( function () { spinnerAndRun( showCommentOptions ); } );
			$afch.find( '#afchSubmit' ).click( function () { spinnerAndRun( showSubmitOptions ); } );
			$afch.find( '#afchClean' ).click( function () { handleCleanup(); } );
			$afch.find( '#afchMark' ).click( function () { handleMark( /* unmark */ submission.isUnderReview ); } );

			// Load warnings about the page, then slide them in
			getSubmissionWarnings().done( function ( warnings ) {
				if ( warnings.length ) {
					// FIXME: CSS-based slide-in animation instead to avoid having
					// to use stupid hide() + removeClass() workaround?
					$afch.find( '.warnings' )
						.append( warnings )
						.hide().removeClass( 'hidden' )
						.slideDown();
				}
			} );

			// Get G13 eligibility and when known, display relevant buttons...
			// but don't hold up the rest of the loading to do so
			submission.isG13Eligible().done( function ( eligible ) {
				$afch.find( '.g13-related' ).toggleClass( 'hidden', !eligible );
				$afch.find( '#afchG13' ).click( function () { handleG13(); } );
				$afch.find( '#afchPostponeG13' ).click( function () { spinnerAndRun( showPostponeG13Options ); } );
			} );
		} );
	}

	/**
	 * Loads warnings about the submission
	 * @return {jQuery}
	 */
	function getSubmissionWarnings() {
		var deferred = $.Deferred(),
			warnings = [];

		/**
		 * Adds a warning
		 * @param {string} message
		 * @param {string|bool} actionMessage set to false to hide action link
		 * @param {function|string} onAction function to call of success, or URL to browse to
		 */
		function addWarning( message, actionMessage, onAction ) {
			var $action,
				$warning = $( '<div>' )
					.addClass( 'afch-warning' )
					.text( message );

			if ( actionMessage !== false ) {
				$action = $( '<a>' )
					.addClass( 'link' )
					.text( actionMessage || 'Edit page' )
					.appendTo( $warning );

				if ( typeof onAction === 'function' ) {
					$action.click( onAction );
				} else {
					$action
						.attr( 'target', '_blank' )
						.attr( 'href', onAction || mw.util.getUrl( AFCH.consts.pagename, { action: 'edit' } ) );
				}
			}

			warnings.push( $warning );
		}

		function checkReferences() {
			var deferred = $.Deferred();

			afchPage.getText( false ).done( function ( text ) {
				var refBeginRe = /<\s*ref.*?\s*>/ig,
					refBeginMatches = $.grep( text.match( refBeginRe ) || [], function ( ref ) {
						// If the ref is closed already, we don't want it
						// (returning true keeps the item, false removes it)
						return ref.indexOf( '/>', ref.length - 2 ) === -1;
					} ),

					refEndRe = /<\/\s*ref\s*\>/ig,
					refEndMatches = text.match( refEndRe ) || [],

					reflistRe = /({{(ref(erence)?(\s|-)?list|listaref|refs|footnote|reference|referencias)(?:{{[^{}]*}}|[^}{])*}})|(<\s*references\s*\/?>)/ig,
					hasReflist = reflistRe.test( text ),

					// This isn't as good as a tokenizer, and believes that <ref> foo </b> is
					// completely correct... but it's a good intermediate level solution.
					malformedRefs = text.match( /<\s*ref\s*[^\/]*>?<\s*[^\/]*\s*ref\s*>/ig ) || [];

				// Uneven (/unclosed) <ref> and </ref> tags
				if ( refBeginMatches.length !== refEndMatches.length ) {
					addWarning( 'The submission contains ' +
						( refBeginMatches.length > refEndMatches.length ? 'unclosed' : 'unbalanced' ) + ' <ref> tags.' );
				}

				// <ref>1<ref> instead of <ref>1</ref> detection
				if ( malformedRefs.length ) {
					addWarning( 'The submission contains malformed <ref> tags.', 'View details', function () {
						var $toggleLink = $( this ).addClass( 'malformed-refs-toggle' ),
							$warningDiv = $( this ).parent();
						$malformedRefWrapper = $( '<div>' )
							.addClass( 'malformed-refs' )
							.appendTo( $warningDiv );

						// Show the relevant code snippets
						$.each( malformedRefs, function ( _, ref ) {
							$( '<div>' )
								.addClass( 'code-wrapper' )
								.append( $( '<pre>' ).text( ref ) )
								.appendTo( $malformedRefWrapper );
						} );

						// Now change the "View details" link to behave as a normal toggle for .malformed-refs
						AFCH.makeToggle( '.malformed-refs-toggle', '.malformed-refs', 'View details', 'Hide details' );

						return false;
					} );
				}

				// <ref> after {{reflist}}
				if ( hasReflist ) {
					if ( refBeginRe.test( text.substring( reflistRe.lastIndex ) ) ) {
						addWarning( 'Not all of the <ref> tags are before the references list. You may not see all references.' );
					}
				}

				// <ref> without {{reflist}}
				if ( refBeginMatches.length && !hasReflist ) {
					addWarning( 'The submission contains <ref> tags, but has no references list! You may not see all references.' );
				}

				deferred.resolve();
			} );

			return deferred;
		}

		function checkDeletionLog() {
			var deferred = $.Deferred();

			// Don't show deletion notices for "sandbox" to avoid useless
			// information when reviewing user sandboxes and the like
			if ( afchSubmission.shortTitle.toLowerCase() === 'sandbox' ) {
				deferred.resolve();
				return deferred;
			}

			AFCH.api.get( {
				action: 'query',
				list: 'logevents',
				leprop: 'user|timestamp|comment',
				leaction: 'delete/delete',
				letype: 'delete',
				lelimit: 10,
				letitle: afchSubmission.shortTitle
			} ).done( function ( data ) {
				var rawDeletions = data.query.logevents;

				if ( !rawDeletions.length ) {
					deferred.resolve();
					return;
				}

				addWarning( 'The page "' + afchSubmission.shortTitle + '" has been deleted ' + rawDeletions.length + ( rawDeletions.length === 10 ? '+' : '' ) +
					' time' + ( rawDeletions.length > 1 ? 's' : '' ) + '.', 'View deletion log', function () {
					var $toggleLink = $( this ).addClass( 'deletion-log-toggle' ),
						$warningDiv = $toggleLink.parent(),
						deletions = [];

					$.each( rawDeletions, function ( _, deletion ) {
						deletions.push( {
							timestamp: deletion.timestamp,
							relativeTimestamp: AFCH.relativeTimeSince( deletion.timestamp ),
							deletor: deletion.user,
							deletorLink: mw.util.getUrl( 'User:' + deletion.user ),
							reason: AFCH.convertWikilinksToHTML( deletion.comment )
						} );
					} );

					$( afchViews.renderView( 'warning-deletions-table', { deletions: deletions } ) )
						.addClass( 'deletion-log' )
						.appendTo( $warningDiv );

					// ...and now convert the link into a toggle which simply hides/shows the div
					AFCH.makeToggle( '.deletion-log-toggle', '.deletion-log', 'View deletion log', 'Hide deletion log' );

					return false;
				} );

				deferred.resolve();

			} );

			return deferred;
		}

		function checkReviewState() {
			var reviewer, isOwnReview;

			if ( afchSubmission.isUnderReview ) {
				isOwnReview = afchSubmission.params.reviewer === AFCH.consts.user;

				if ( isOwnReview ) {
					reviewer = 'You';
				} else {
					reviewer = afchSubmission.params.reviewer || 'Someone';
				}

				addWarning( reviewer + ( afchSubmission.params.reviewts ?
					' began reviewing this submission ' + AFCH.relativeTimeSince( afchSubmission.params.reviewts ) :
					' already began reviewing this submission' ) + '.',
				isOwnReview ? 'Unmark as under review' : 'View page history',
				isOwnReview ? function () {
					handleMark( /* unmark */ true );
				} : mw.util.getUrl( AFCH.consts.pagename, { action: 'history' } ) );
			}
		}

		function checkLongComments() {
			var deferred = $.Deferred();

			afchPage.getText( false ).done( function ( rawText ) {
				var
					// Simulate cleanUp first so that we don't warn about HTML
					// comments that the script will remove anyway in the future
					text = ( new AFCH.Text( rawText ) ).cleanUp( true ),
					longCommentRegex = /(?:<![ \r\n\t]*--)([^\-]|[\r\n]|-[^\-]){30,}(?:--[ \r\n\t]*>)?/g,
					longCommentMatches = text.match( longCommentRegex ) || [],
					numberOfComments = longCommentMatches.length,
					oneComment = numberOfComments === 1;

				if ( numberOfComments ) {
					addWarning( 'The page contains ' + ( oneComment ? 'an' : '' ) + ' HTML comment' + ( oneComment ? '' : 's' ) +
						' longer than 30 characters.', 'View comment' + ( oneComment ? '' : 's' ), function () {
						var $toggleLink = $( this ).addClass( 'long-comment-toggle' ),
							$warningDiv = $( this ).parent(),
							$commentsWrapper = $( '<div>' )
								.addClass( 'long-comments' )
								.appendTo( $warningDiv );

							// Show the relevant code snippets
						$.each( longCommentMatches, function ( _, comment ) {
							$( '<div>' )
								.addClass( 'code-wrapper' )
								.append( $( '<pre>' ).text( $.trim( comment ) ) )
								.appendTo( $commentsWrapper );
						} );

						// Now change the "View comment" link to behave as a normal toggle for .long-comments
						AFCH.makeToggle( '.long-comment-toggle', '.long-comments',
							'View comment' + ( oneComment ? '' : 's' ), 'Hide comment' + ( oneComment ? '' : 's' ) );

						return false;
					} );
				}

				deferred.resolve();
			} );

			return deferred;
		}

		$.when(
			checkReferences(),
			checkDeletionLog(),
			checkReviewState(),
			checkLongComments()
		).then( function () {
			deferred.resolve( warnings );
		} );

		return deferred;
	}

	/**
	 * Stores useful strings to AFCH.msg
	 */
	function setMessages() {
		var headerBegin = '== Your submission at [[Wikipedia:Articles for creation|Articles for creation]]: ';
		AFCH.msg.set( {
			// $1 = article name
			// $2 = article class or '' if not available
			'accepted-submission': headerBegin +
				'[[$1]] has been accepted ==\n{{subst:Afc talk|$1|class=$2|sig=~~' + '~~}}',

			// $1 = full submission title
			// $2 = short title
			// $3 = copyright violation ('yes'/'no')
			// $4 = decline reason code
			// $5 = decline reason additional parameter
			// $6 = second decline reason code
			// $7 = additional parameter for second decline reason
			// $8 = additional comment
			'declined-submission': headerBegin +
				'[[$1|$2]] ({{subst:CURRENTMONTHNAME}} {{subst:CURRENTDAY}}) ==\n{{subst:Afc decline|full=$1|cv=$3|reason=$4|details=$5|reason2=$6|details2=$7|comment=$8|sig=yes}}',

			// $1 = full submission title
			// $2 = short title
			// $3 = reject reason code ('e' or 'n')
			// $4 = reject reason details (blank for now)
			// $5 = second reject reason code
			// $6 = second reject reason details
			// $7 = comment by reviewer
			'rejected-submission': headerBegin +
				'[[$1|$2]] ({{subst:CURRENTMONTHNAME}} {{subst:CURRENTDAY}}) ==\n{{subst:Afc reject|full=$1|reason=$3|details=$4|reason2=$5|details2=$6|comment=$7|sig=yes}}',

			// $1 = article name
			'comment-on-submission': '{{subst:AFC notification|comment|article=$1}}',

			// $1 = article name
			'g13-submission': '{{subst:Db-afc-notice|$1}} ~~' + '~~',

			'teahouse-invite': '{{subst:Wikipedia:Teahouse/AFC invitation|sign=~~' + '~~}}'
		} );
	}

	/**
	 * Clear the viewer, set up the status log, and
	 * then update the button text
	 * @param {string} actionTitle optional, if there is no content available and the
	 *                             script has to load a new view, this will be its title
	 * @param {string} actionClass optional, if there is no content available and the
	 *                             script has to load a new view, this will be the class
	 *                             applied to it
	 */
	function prepareForProcessing( actionTitle, actionClass ) {
		var $content = $afch.find( '#afchContent' ),
			$submitBtn = $content.find( '#afchSubmitForm' );

		// If we can't find a submit button or a content area, load
		// a new temporary "processing" stage instead
		if ( !( $submitBtn.length || $content.length ) ) {
			loadView( 'quick-action-processing', {
				actionTitle: actionTitle || 'Processing',
				actionClass: actionClass || 'other-action'
			} );

			// Now update the variables
			$content = $afch.find( '#afchContent' );
			$submitBtn = $content.find( '#afchSubmitForm' );
		}

		// Empty the content area except for the button...
		$content.contents().not( $submitBtn ).remove();

		// ...and set up the status log in its place
		AFCH.status.init( '#afchContent' );

		// Update the button show the `running` text
		$submitBtn
			.text( $submitBtn.data( 'running' ) )
			.addClass( 'disabled' )
			.off( 'click' );

		// Handler will run after the main AJAX requests complete
		setupAjaxStopHandler();

	}

	/**
	 * Sets up the `ajaxStop` handler which runs after all ajax
	 * requests are complete and changes the text of the button
	 * to "Done", shows a link to the next submission and
	 * auto-reloads the page.
	 */
	function setupAjaxStopHandler() {
		$( document ).ajaxStop( function () {
			$afch.find( '#afchSubmitForm' )
				.text( 'Done' )
				.append(
					' ',
					$( '<a>' )
						.attr( 'id', 'reloadLink' )
						.addClass( 'text-smaller' )
						.attr( 'href', mw.util.getUrl() )
						.text( '(reloading...)' )
				);

			// Show a link to the next random submissions
			new AFCH.status.Element( 'Continue to next $1, $2, or $3 &raquo;', {
				$1: AFCH.makeLinkElementToCategory( 'Pending AfC submissions', 'random submission' ),
				$2: AFCH.makeLinkElementToCategory( 'AfC pending submissions by age/0 days ago', 'GFOO submission' ),
				$3: AFCH.makeLinkElementToCategory( 'AfC pending submissions by age/Very old', 'very old submission' )
			} );

			// Also, automagically reload the page in place
			$( '#mw-content-text' ).load( AFCH.consts.pagelink + ' #mw-content-text', function () {
				$afch.find( '#reloadLink' ).text( '(reloaded automatically)' );
				// Fire the hook for new page content
				mw.hook( 'wikipage.content' ).fire( $( '#mw-content-text' ) );
			} );

			// Stop listening to ajaxStop events; otherwise these can stack up if
			// the user goes back to perform another action, for example
			$( document ).off( 'ajaxStop' );
		} );
	}

	/**
	 * Adds handler for when the accept/decline/etc form is submitted
	 * that calls a given function and passes an object to the function
	 * containing data from all .afch-input elements in the dom.
	 *
	 * Also sets up the viewer for the "processing" stage.
	 *
	 * @param {Function} fn function to call with data
	 */
	function addFormSubmitHandler( fn ) {
		$afch.find( '#afchSubmitForm' ).click( function () {
			var data = {};

			// Provide page text; use cache created after afchSubmission.parse()
			afchPage.getText( false ).done( function ( text ) {
				data.afchText = new AFCH.Text( text );

				// Also provide the values for each afch-input element
				$.extend( data, AFCH.getFormValues( $afch.find( '.afch-input' ) ) );

				prepareForProcessing();

				// Now finally call the applicable handler
				fn( data );
			} );
		} );
	}

	/**
	 * Displays a spinner in the main content area and then
	 * calls the passed function
	 * @param {function} fn function to call when spinner has been displayed
	 * @return {[type]} [description]
	 */
	function spinnerAndRun( fn ) {
		var $spinner, $container = $afch.find( '#afchContent' );

		// Add a new spinner if one doesn't already exist
		if ( !$container.find( '.mw-spinner' ).length ) {

			$spinner = $.createSpinner( {
				size: 'large',
				type: 'block'
			} )
				// Set the spinner's dimensions equal to the viewers's dimensions so that
				// the current scroll position is not lost when emptied
				.css( {
					height: $container.height(),
					width: $container.width()
				} );

			$container.empty().append( $spinner );
		}

		if ( typeof fn === 'function' ) {
			fn();
		}
	}

	/**
	 * Loads a new view
	 * @param {string} name view to be loaded
	 * @param {object} data data to populate the view with
	 * @param {function} callback function to call when view is loaded
	 */
	function loadView( name, data, callback ) {
		// Show the back button if we're not loading the main view
		$afch.find( '.back-link' ).toggleClass( 'hidden', name === 'main' );
		afchViewer.loadView( name, data );
		if ( callback ) {
			callback();
		}
	}

	// These functions show the options before doing something
	// to a submission.

	function showAcceptOptions() {
		/**
		 * If possible, use the session storage to get the WikiProject list.
		 * If it hasn't been cached already, load it manually and then cache
		 */
		function loadWikiProjectList() {
			var deferred = $.Deferred(),
				wikiProjects = [],
				// This is so a new version of AFCH will invalidate the WikiProject cache
				lsKey = 'afch-' + AFCH.consts.version + '-wikiprojects-1';

			if ( window.localStorage && window.localStorage[ lsKey ] ) {
				wikiProjects = JSON.parse( window.localStorage[ lsKey ] );
				deferred.resolve( wikiProjects );
			} else {
				$.ajax( {
					url: mw.config.get( 'wgServer' ) + '/w/index.php?title=User:Theo%27s_Little_Bot/afchwikiproject.js&action=raw&ctype=text/javascript',
					dataType: 'json'
				} ).done( function ( projectData ) {
					$.each( projectData, function ( display, template ) {
						wikiProjects.push( {
							displayName: display,
							templateName: template
						} );
					} );

					// If possible, cache the WikiProject data!
					if ( window.localStorage ) {
						try {
							window.localStorage[ lsKey ] = JSON.stringify( wikiProjects );
						} catch ( e ) {
							AFCH.log( 'Unable to cache WikiProject list: ' + e.message );
						}
					}

					deferred.resolve( wikiProjects );
				} );
			}

			return deferred;
		}

		$.when(
			afchPage.getText( false ),
			loadWikiProjectList(),
			afchPage.getCategories( /* useApi */ false, /* includeCategoryLinks */ true )
		).then( function ( pageText, wikiProjects, categories ) {
			loadView( 'accept', {
				newTitle: afchSubmission.shortTitle,
				hasWikiProjects: !!wikiProjects.length,
				wikiProjects: wikiProjects,
				categories: categories,
				// Only offer to patrol the page if not already patrolled (in other words, if
				// the "Mark as patrolled" link can be found in the DOM)
				showPatrolOption: !!$afch.find( '.patrollink' ).length
			}, function () {
				$afch.find( '#newAssessment' ).chosen( {
					allow_single_deselect: true,
					disable_search: true,
					width: '140px',
					placeholder_text_single: 'Click to select'
				} );

				$afch.find( '#newWikiProjects' ).chosen( {
					placeholder_text_multiple: 'Start typing to filter WikiProjects...',
					no_results_text: 'Whoops, no WikiProjects matched in database!',
					width: '350px'
				} );

				// Extend the chosen menu for new WikiProjects. We hackily show a
				// "Click to manually add {{PROJECT}}" link -- sadly, jquery.chosen
				// doesn't support this natively.
				$afch.find( '#newWikiProjects_chzn input' ).keyup( function ( e ) {
					var $chzn = $afch.find( '#newWikiProjects_chzn' ),
						$input = $( this ),
						newProject = $input.val(),
						$noResults = $chzn.find( 'li.no-results' );

					// Only show "Add {{PROJECT}}" link if there are no results
					if ( $noResults.length ) {
						$( '<div>' )
							.appendTo( $noResults.empty() )
							.text( 'Whoops, no WikiProjects matched in database! ' )
							.append(
								$( '<a>' )
									.text( 'Click to manually add {{' + newProject + '}} to the page\'s WikiProject list.' )
									.click( function () {
										var $wikiprojects = $afch.find( '#newWikiProjects' );

										$( '<option>' )
											.attr( 'value', newProject )
											.attr( 'selected', true )
											.text( newProject )
											.appendTo( $wikiprojects );

										$wikiprojects.trigger( 'liszt:updated' );
										$input.val( '' );
									} )
							);
					}
				} );

				$afch.find( '#newCategories' ).chosen( {
					placeholder_text_multiple: 'Start typing to add categories...',
					width: '350px'
				} );

				// Offer dynamic category suggestions!
				// Since jquery.chosen doesn't natively support dynamic results,
				// we sneakily inject some dynamic suggestions instead. Consider
				// switching to something like Select2 to avoid this hackery...
				$afch.find( '#newCategories_chosen input' ).keyup( function ( e ) {
					var $input = $( this ),
						prefix = $input.val(),
						$categories = $afch.find( '#newCategories' );

					// Ignore up/down keys to allow users to navigate through the suggestions,
					// and don't show results when an empty string is provided
					if ( [ 38, 40 ].indexOf( e.which ) !== -1 || !prefix ) {
						return;
					}

					// The worst hack. Because Chosen keeps messing with the
					// width of the text box, keep on resetting it to 100%
					$input.css( 'width', '100%' );
					$input.parent().css( 'width', '100%' );

					AFCH.api.getCategoriesByPrefix( prefix ).done( function ( categories ) {

						// Reset the text box width again
						$input.css( 'width', '100%' );
						$input.parent().css( 'width', '100%' );

						// If the input has changed since we started searching,
						// don't show outdated results
						if ( $input.val() !== prefix ) {
							return;
						}

						// Clear existing suggestions
						$categories.children().not( ':selected' ).remove();

						// Now, add the new suggestions
						$.each( categories, function ( _, category ) {
							$( '<option>' )
								.attr( 'value', category )
								.text( category )
								.appendTo( $categories );
						} );

						// We've changed the <select>, now tell Chosen to
						// rebuild the visible list
						$categories.trigger( 'liszt:updated' );
						$categories.trigger( 'chosen:updated' );
						$input.val( prefix );
						$input.css( 'width', '100%' );
						$input.parent().css( 'width', '100%' );
					} );
				} );

				// Show bio options if Biography option checked
				$afch.find( '#isBiography' ).change( function () {
					$afch.find( '#bioOptionsWrapper' ).toggleClass( 'hidden', !this.checked );
				} );

				function prefillBiographyDetails() {
					var titleParts;

					// Prefill `LastName, FirstName` for Biography if the page title is two words and
					// therefore probably safe to asssume in a `FirstName LastName` format.
					titleParts = afchSubmission.shortTitle.split( ' ' );
					if ( titleParts.length === 2 ) {
						$afch.find( '#subjectName' ).val( titleParts[ 1 ] + ', ' + titleParts[ 0 ] );
					}
				}
				prefillBiographyDetails();

				// Ask for the month/day IF the birth year has been entered
				$afch.find( '#birthYear' ).keyup( function () {
					$afch.find( '#birthMonthDayWrapper' ).toggleClass( 'hidden', !this.value.length );
				} );

				// Ask for the month/day IF the death year has been entered
				$afch.find( '#deathYear' ).keyup( function () {
					$afch.find( '#deathMonthDayWrapper' ).toggleClass( 'hidden', !this.value.length );
				} );

				// If subject is dead, show options for death details
				$afch.find( '#lifeStatus' ).change( function () {
					$afch.find( '#deathWrapper' ).toggleClass( 'hidden', $( this ).val() !== 'dead' );
				} );

				// Show an error if the page title already exists in the mainspace,
				// or if the title is create-protected and user is not an admin
				$afch.find( '#newTitle' ).keyup( function () {
					var page,
						linkToPage,
						$field = $( this ),
						$status = $afch.find( '#titleStatus' ),
						$submitButton = $afch.find( '#afchSubmitForm' ),
						value = $field.val();

					// Reset to a pure state
					$field.removeClass( 'bad-input' );
					$status.text( '' );
					$submitButton
						.removeClass( 'disabled' )
						.text( 'Accept & publish' );

					// If there is no value, die now, because otherwise mw.Title
					// will throw an exception due to an invalid title
					if ( !value ) {
						return;
					}
					page = new AFCH.Page( value );
					linkToPage = AFCH.jQueryToHtml( AFCH.makeLinkElementToPage( page.rawTitle ) );

					AFCH.api.get( {
						action: 'query',
						titles: 'Talk:' + page.rawTitle
					} ).done( function ( data ) {
						if ( !data.query.pages.hasOwnProperty( '-1' ) ) {
							$status.html( 'The talk page for "' + linkToPage + '" exists.' );
						}
					} );

					$.when(
						AFCH.api.isBlacklisted( page ),
						AFCH.api.get( {
							action: 'query',
							prop: 'info',
							inprop: 'protection',
							titles: page.rawTitle
						} )
					).then( function ( isBlacklisted, rawData ) {
						var errorHtml, buttonText,
							data = rawData[ 0 ]; // Get just the result, not the Promise object

						// If the page already exists, display an error
						if ( !data.query.pages.hasOwnProperty( '-1' ) ) {
							errorHtml = 'Whoops, the page "' + linkToPage + '" already exists.';
							buttonText = 'The proposed title already exists';
						} else {
							// If the page doesn't exist but IS create-protected and the
							// current reviewer is not an admin, also display an error
							// FIXME: offer one-click request unprotection?
							$.each( data.query.pages[ '-1' ].protection, function ( _, entry ) {
								if ( entry.type === 'create' && entry.level === 'sysop' &&
									$.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) === -1 ) {
									errorHtml = 'Darn it, "' + linkToPage + '" is create-protected. You will need to request unprotection before accepting.';
									buttonText = 'The proposed title is create-protected';
								}
							} );
						}

						// Now check the blacklist result, but if another error already exists,
						// don't bother showing this one too
						if ( !errorHtml && isBlacklisted !== false ) {
							errorHtml = 'Shoot! ' + isBlacklisted.reason.replace( /\s+/g, ' ' );
							buttonText = 'The proposed title is blacklisted';
						}

						if ( !errorHtml ) {
							return;
						}

						// Add a red border around the input field
						$field.addClass( 'bad-input' );

						// Show the error message
						$status.html( errorHtml );

						// Disable the submit button and show an error in its place
						$submitButton
							.addClass( 'disabled' )
							.text( buttonText );
					} );
				} );

				// Update titleStatus
				$afch.find( '#newTitle' ).trigger( 'keyup' );

			} );

			addFormSubmitHandler( handleAccept );

		} );
	}

	function showDeclineOptions() {
		loadView( 'decline', {}, function () {
			var $reasons, $commonSection, declineCounts,
				pristineState = $afch.find( '#declineInputWrapper' ).html();

			// pos is either 1 or 2, based on whether the chosen reason that
			// is triggering this update is first or second in the multi-select
			// control
			function updateTextfield( newPrompt, newPlaceholder, newValue, pos ) {
				var wrapper = $afch.find( '#textfieldWrapper' + ( pos === 2 ? '2' : '' ) );

				// Update label and placeholder
				wrapper.find( 'label' ).text( newPrompt );
				wrapper.find( 'input' ).attr( 'placeholder', newPlaceholder );

				// Update default textfield value (perhaps)
				if ( typeof newValue !== 'undefined' ) {
					wrapper.find( 'input' ).val( newValue );
				}

				// And finally show the textfield
				wrapper.removeClass( 'hidden' );
			}

			// Copy most-used options to top of decline dropdown

			declineCounts = AFCH.userData.get( 'decline-counts', false );

			if ( declineCounts ) {
				declineList = $.map( declineCounts, function ( _, key ) { return key; } );

				// Sort list in descending order (most-used at beginning)
				declineList.sort( function ( a, b ) {
					return declineCounts[ b ] - declineCounts[ a ];
				} );

				$reasons = $afch.find( '#declineReason' );
				$commonSection = $( '<optgroup>' )
					.attr( 'label', 'Frequently used' )
					.insertBefore( $reasons.find( 'optgroup' ).first() );

				// Show the 5 most used options
				$.each( declineList.splice( 0, 5 ), function ( _, rationale ) {
					var $relevant = $reasons.find( 'option[value="' + rationale + '"]' );
					$relevant.clone( true ).appendTo( $commonSection );
				} );
			}

			// Set up jquery.chosen for the decline reason
			$afch.find( '#declineReason' ).chosen( {
				placeholder_text_single: 'Select a decline reason...',
				no_results_text: 'Whoops, no reasons matched your search. Type "custom" to add a custom rationale instead.',
				search_contains: true,
				inherit_select_classes: true,
				max_selected_options: 2
			} );

			// Set up jquery.chosen for the reject reason
			$afch.find( '#rejectReason' ).chosen( {
				placeholder_text_single: 'Select a reject reason...',
				search_contains: true,
				inherit_select_classes: true,
				max_selected_options: 2
			} );

			// rejectReason starts off hidden by default, which makes the _chosen div
			// display at 0px wide for some reason. We must manually fix this.
			$afch.find( '#rejectReason_chosen' ).css( 'width', '350px' );

			// And now add the handlers for when a specific decline reason is selected
			$afch.find( '#declineReason' ).change( function () {
				var reason = $afch.find( '#declineReason' ).val(),
					candidateDupeName = ( afchSubmission.shortTitle !== 'sandbox' ) ? afchSubmission.shortTitle : '',
					prevDeclineComment = $afch.find( '#declineTextarea' ).val(),
					declineHandlers = {
						cv: function ( pos ) {
							$afch.find( '#cvUrlWrapper' ).removeClass( 'hidden' );
							$afch.add( '#csdWrapper' ).removeClass( 'hidden' );

							$afch.find( '#cvUrlTextarea' ).keyup( function () {
								var text = $( this ).val(),
									numUrls = text ? text.split( '\n' ).length : 0,
									submitButton = $afch.find( '#afchSubmitForm' );
								if ( numUrls >= 1 && numUrls <= 3 ) {
									$( this ).removeClass( 'bad-input' );
									submitButton
										.removeClass( 'disabled' )
										.text( 'Decline submission' );
								} else {
									$( this ).addClass( 'bad-input' );
									submitButton
										.addClass( 'disabled' )
										.text( 'Please enter between one and three URLs!' );
								}
							} );

							// Check if there's an OTRS notice
							new AFCH.Page( 'Draft talk:' + afchSubmission.shortTitle ).getText( /* usecache */ false ).done( function ( text ) {
								if ( /ConfirmationOTRS/.test( text ) ) {
									$afch.find( '#declineInputWrapper' ).append(
										$( '<div>' )
											.addClass( 'warnings' )
											.css( {
												'max-width': '50%',
												margin: '0px auto'
											} )
											.text( 'This draft has an OTRS template on the talk page. Verify that the copyright violation isn\'t covered by the template before marking this draft as a copyright violation.' ) );
								}
							} );
						},

						dup: function ( pos ) {
							updateTextfield( 'Title of duplicate submission (no namespace)', 'Articles for creation/Fudge', candidateDupeName, pos );
						},

						mergeto: function ( pos ) {
							updateTextfield( 'Article which submission should be merged into', 'Milkshake', candidateDupeName, pos );
						},

						lang: function ( pos ) {
							updateTextfield( 'Language of the submission if known', 'German', pos );
						},

						exists: function ( pos ) {
							updateTextfield( 'Title of existing article', 'Chocolate chip cookie', candidateDupeName, pos );
						},

						plot: function ( pos ) {
							updateTextfield( 'Title of existing related article, if one exists', 'Charlie and the Chocolate Factory', candidateDupeName, pos );
						},

						// Custom decline rationale
						reason: function () {
							$afch.find( '#declineTextarea' )
								.attr( 'placeholder', 'Enter your decline reason here using wikicode syntax.' );
						}
					};

				// Reset to a pristine state :)
				$afch.find( '#declineInputWrapper' ).html( pristineState );

				// If there are special options to be displayed for each
				// particular decline reason, load them now
				if ( declineHandlers[ reason[ 0 ] ] ) {
					declineHandlers[ reason[ 0 ] ]( 1 );
				}
				if ( declineHandlers[ reason[ 1 ] ] ) {
					declineHandlers[ reason[ 1 ] ]( 2 );
				}

				// Preserve the custom comment text
				$afch.find( '#declineTextarea' ).val( prevDeclineComment );

				// If the user wants a preview, show it
				if ( $( '#previewTrigger' ).text() == '(hide preview)' ) {
					$( '#previewContainer' )
						.empty()
						.append( $.createSpinner( {
							size: 'large',
							type: 'block'
						} ).css( 'padding', '20px' ) );
					AFCH.getReason( reason ).done( function ( html ) {
						$( '#previewContainer' ).html( html );
					} );
				}

				// If a reason has been specified, show the textarea, notify
				// option, and the submit form button
				$afch.find( '#declineTextarea' ).add( '#notifyWrapper' ).add( '#afchSubmitForm' )
					.toggleClass( 'hidden', !reason );
			} ); // End change handler for the decline reason select box

			// And the the handlers for when a specific REJECT reason is selected
			$afch.find( '#rejectReason' ).change( function () {
				var reason = $afch.find( '#rejectReason' ).val();

				// If a reason has been specified, show the textarea, notify
				// option, and the submit form button
				$afch.find( '#rejectTextarea' ).add( '#notifyWrapper' ).add( '#afchSubmitForm' )
					.toggleClass( 'hidden', !reason );
			} ); // End change handler for the reject reason select box

			// Attach the preview event listener
			$afch.find( '#previewTrigger' ).click( function () {
				var reason = $afch.find( '#declineReason' ).val();
				if ( this.textContent == '(preview)' && reason ) {
					$( '#previewContainer' )
						.empty()
						.append( $.createSpinner( {
							size: 'large',
							type: 'block'
						} ).css( 'padding', '20px' ) );
					var reasonDeferreds = reason.map( AFCH.getReason );
					$.when.apply( $, reasonDeferreds ).then( function ( a, b ) {
						$( '#previewContainer' )
							.html( Array.prototype.slice.call( arguments )
								.join( '<hr />' ) );
					} );
					this.textContent = '(hide preview)';
				} else {
					$( '#previewContainer' ).empty();
					this.textContent = '(preview)';
				}
			} );

			// Attach the decline vs reject radio button listener
			$afch.find( 'input[type=radio][name=declineReject]' ).click( function () {
				var declineOrReject = $afch.find( 'input[name=declineReject]:checked' ).val();
				$afch.find( '#declineReasonWrapper' ).toggleClass( 'hidden', declineOrReject === 'reject' );
				$afch.find( '#rejectReasonWrapper' ).toggleClass( 'hidden', declineOrReject === 'decline' );
				$afch.find( '#declineInputWrapper' ).toggleClass( 'hidden', declineOrReject === 'reject' );
				$afch.find( '#rejectInputWrapper' ).toggleClass( 'hidden', declineOrReject === 'decline' );
			} );
		} ); // End loadView callback

		addFormSubmitHandler( handleDecline );
	}

	function showCommentOptions() {
		loadView( 'comment', {} );
		addFormSubmitHandler( handleComment );
	}

	function showSubmitOptions() {
		var customSubmitters = [];

		// Iterate over the submitters and add them to the custom submitters list,
		// displayed in the "submit as" dropdown.
		$.each( afchSubmission.submitters, function ( index, submitter ) {
			customSubmitters.push( {
				name: submitter,
				description: submitter + ( index === 0 ? ' (most recent submitter)' : ' (past submitter)' ),
				selected: index === 0
			} );
		} );

		loadView( 'submit', {
			customSubmitters: customSubmitters
		}, function () {

			// Reset the status indicators for the username & errors
			function resetStatus() {
				$afch.find( '#submitterName' ).removeClass( 'bad-input' );
				$afch.find( '#submitterNameStatus' ).text( '' );
				$afch.find( '#afchSubmitForm' )
					.removeClass( 'disabled' )
					.text( 'Submit' );
			}

			// Show the other textbox when `other` is selected in the menu
			$afch.find( '#submitType' ).change( function () {
				var isOtherSelected = $afch.find( '#submitType' ).val() === 'other';

				if ( isOtherSelected ) {
					$afch.find( '#submitterNameWrapper' ).removeClass( 'hidden' );
					$afch.find( '#submitterName' ).trigger( 'keyup' );
				} else {
					$afch.find( '#submitterNameWrapper' ).addClass( 'hidden' );
				}

				resetStatus();

				// Show an error if there's no such user
				$afch.find( '#submitterName' ).keyup( function () {
					var field = $( this ),
						status = $( '#submitterNameStatus' ),
						submitButton = $afch.find( '#afchSubmitForm' ),
						submitter = field.val();

					// Reset form
					resetStatus();

					// If there's no value, don't even try
					if ( !submitter || !isOtherSelected ) {
						return;
					}

					// Check if the user string starts with "User:", because Template:AFC submission dies horribly if it does
					if ( submitter.lastIndexOf( 'User:', 0 ) === 0 ) {
						field.addClass( 'bad-input' );
						status.text( 'Remove "User:" from the beginning.' );
						submitButton
							.addClass( 'disabled' )
							.text( 'Invalid user name' );
						return;
					}

					// Check if there is such a user
					AFCH.api.get( {
						action: 'query',
						list: 'users',
						ususers: submitter
					} ).done( function ( data ) {
						if ( data.query.users[ 0 ].missing !== undefined ) {
							field.addClass( 'bad-input' );
							status.text( 'No user named "' + submitter + '".' );
							submitButton
								.addClass( 'disabled' )
								.text( 'No such user' );
						}
					} );
				} );
			} );
		} );

		addFormSubmitHandler( handleSubmit );
	}

	function showPostponeG13Options() {
		loadView( 'postpone-g13', {} );
		addFormSubmitHandler( handlePostponeG13 );
	}

	// These functions actually perform a given action using data passed
	// in the `data` parameter.

	function handleAccept( data ) {
		var newText = data.afchText;

		AFCH.actions.movePage( afchPage.rawTitle, data.newTitle,
			'Publishing accepted [[Wikipedia:Articles for creation|Articles for creation]] submission',
			{ movetalk: true } ) // Also move associated talk page if exists (e.g. `Draft_talk:`)
			.done( function ( moveData ) {
				var $patrolLink,
					newPage = new AFCH.Page( moveData.to ),
					talkPage = newPage.getTalkPage(),
					recentPage = new AFCH.Page( 'Wikipedia:Articles for creation/recent' ),
					talkText = '';

				// ARTICLE
				// -------

				newText.removeAfcTemplates();

				newText.updateCategories( data.newCategories );

				// Clean the page
				newText.cleanUp( /* isAccept */ true );

				// Add biography details
				if ( data.isBiography ) {

					// {{subst:L}}, which generates DEFAULTSORT as well as
					// adds the appropriate birth/death year categories
					newText.append( '\n{{subst:L' +
						'|1=' + data.birthYear +
						'|2=' + ( data.deathYear || '' ) +
						'|3=' + data.subjectName + '}}'
					);

				}

				newPage.edit( {
					contents: newText.get(),
					summary: 'Cleaning up accepted [[Wikipedia:Articles for creation|Articles for creation]] submission'
				} );

				// Patrol the new page if desired
				if ( data.patrolPage ) {
					$patrolLink = $afch.find( '.patrollink' );
					if ( $patrolLink.length ) {
						AFCH.actions.patrolRcid(
							mw.util.getParamValue( 'rcid', $patrolLink.find( 'a' ).attr( 'href' ) ),
							newPage.rawTitle // Include the title for a prettier log message
						);
					}
				}

				// TALK PAGE
				// ---------

				// Add the AFC banner
				talkText += '{{subst:WPAFC/article|class=' + data.newAssessment + ( afchPage.additionalData.revId ? '|oldid=' + afchPage.additionalData.revId : '' ) + '}}';

				// Add biography banner if specified
				if ( data.isBiography ) {
					// Ensure we don't have duplicate biography tags
					AFCH.removeFromArray( data.newWikiProjects, 'WikiProject Biography' );

					talkText += ( '\n{{WikiProject Biography|living=' +
						( data.lifeStatus !== 'unknown' ? ( data.lifeStatus === 'living' ? 'yes' : 'no' ) : '' ) +
						'|class=' + data.newAssessment + '|listas=' + data.subjectName + '}}' );
				}

				if ( data.newAssessment === 'disambig' &&
					$.inArray( 'WikiProject Disambiguation', data.newWikiProjects ) === -1 ) {
					data.newWikiProjects.push( 'WikiProject Disambiguation' );
				}

				// Add WikiProjects
				$.each( data.newWikiProjects, function ( i, project ) {
					talkText += '\n{{' + project + '|class=' + data.newAssessment + '}}';
				} );

				talkPage.edit( {
					// We prepend the text so that talk page content is not removed
					// (e.g. pages in `Draft:` namespace with discussion)
					mode: 'prependtext',
					contents: talkText + '\n\n',
					summary: 'Placing [[Wikipedia:Articles for creation|Articles for creation]] banners'
				} );

				// NOTIFY SUBMITTER
				// ----------------

				if ( data.notifyUser ) {
					afchSubmission.getSubmitter().done( function ( submitter ) {
						AFCH.actions.notifyUser( submitter, {
							message: AFCH.msg.get( 'accepted-submission',
								{ $1: newPage, $2: data.newAssessment } ),
							summary: 'Notification: Your [[Wikipedia:Articles for creation|Articles for creation]] submission has been accepted'
						} );
					} );
				}

				// AFC/RECENT
				// ----------

				$.when( recentPage.getText(), afchSubmission.getSubmitter() )
					.then( function ( text, submitter ) {
						var newRecentText = text,
							matches = text.match( /{{afc contrib.*?}}\s*/gi ),
							newTemplate = '{{afc contrib|' + data.newAssessment + '|' + newPage + '|' + submitter + '}}\n';

						// Remove the older entries (at bottom of the page) if necessary
						// to ensure we keep only 10 entries at any given point in time
						while ( matches.length >= 10 ) {
							newRecentText = newRecentText.replace( matches.pop(), '' );
						}

						newRecentText = newTemplate + newRecentText;

						recentPage.edit( {
							contents: newRecentText,
							summary: 'Adding [[' + newPage + ']] to list of recent AfC creations'
						} );
					} );
			} );
	}

	function handleDecline( data ) {
		console.log( data );
		var declineCounts,
			isDecline = data.declineRejectWrapper === 'decline', // true=decline, false=reject
			text = data.afchText,
			declineReason = data.declineReason[ 0 ],
			declineReason2 = data.declineReason.length > 1 ? data.declineReason[ 1 ] : null,
			newParams = {
				decliner: AFCH.consts.user,
				declinets: '{{subst:REVISIONTIMESTAMP}}'
			};

		if ( isDecline ) {
			newParams[ '2' ] = declineReason;

			// If there's a second reason, add it to the params
			if ( declineReason2 ) {
				newParams.reason2 = declineReason2;
			}
		} else {
			newParams[ '2' ] = data.rejectReason[ 0 ];
			if ( data.rejectReason[ 1 ] ) {
				newParams.reason2 = data.rejectReason[ 1 ];
			}
		}

		// Update decline counts
		declineCounts = AFCH.userData.get( 'decline-counts', {} );

		declineCounts[ declineReason ] = ( declineCounts[ declineReason ] || 1 ) + 1;
		if ( declineReason2 ) {
			declineCounts[ declineReason2 ] = ( declineCounts[ declineReason2 ] || 1 ) + 1;
		}

		AFCH.userData.set( 'decline-counts', declineCounts );

		// If the first reason is a custom decline, we include the declineTextarea in the {{AFC submission}} template
		if ( declineReason === 'reason' ) {
			newParams[ '3' ] = data.declineTextarea;
		} else if ( declineReason2 === 'reason' ) {
			newParams.details2 = data.declineTextarea;
		} else if ( data.declineTextarea ) {

			// But otherwise if addtional text has been entered we just add it as a new comment
			afchSubmission.addNewComment( data.declineTextarea );
		}

		// If a user has entered something in the declineTextfield (for example, a URL or an
		// associated page), pass that as the third parameter...
		if ( data.declineTextfield ) {
			newParams[ '3' ] = data.declineTextfield;
		}

		// ...and do the same with the second decline text field
		if ( data.declineTextfield2 ) {
			newParams.details2 = data.declineTextfield2;
		}

		// Copyright violations get {{db-g12}}'d as well
		if ( ( declineReason === 'cv' || declineReason2 === 'cv' ) && data.csdSubmission ) {
			var cvUrls = data.cvUrlTextarea.split( '\n' ).slice( 0, 3 ),
				urlParam = '';

			// Build url param for db-g12 template
			urlParam = cvUrls[ 0 ];
			if ( cvUrls.length > 1 ) {
				urlParam += '|url2=' + cvUrls[ 1 ];
				if ( cvUrls.length > 2 ) {
					urlParam += '|url3=' + cvUrls[ 2 ];
				}
			}
			text.prepend( '{{db-g12|url=' + urlParam + ( afchPage.additionalData.revId ? '|oldid=' + afchPage.additionalData.revId : '' ) + '}}\n' );

			// Include the URLs in the decline template
			if ( declineReason === 'cv' ) {
				newParams[ '3' ] = cvUrls.join( ', ' );
			} else {
				newParams.details2 = cvUrls.join( ', ' );
			}
		}

		if ( !isDecline ) {
			newParams.reject = 'yes';
		}

		// Now update the submission status
		afchSubmission.setStatus( 'd', newParams );

		text.updateAfcTemplates( afchSubmission.makeWikicode() );
		text.cleanUp();

		// Build edit summary
		var editSummary = ( isDecline ? 'Declining' : 'Rejecting' ) + ' submission: ',
			lengthLimit = declineReason2 ? 120 : 180;
		if ( !isDecline || ( declineReason === 'reason' ) ) {

			// If this is a custom decline, use the text in the edit summary
			editSummary += data.declineTextarea.substring( 0, lengthLimit );

			// If we had to trunucate, indicate that
			if ( data.declineTextarea.length > lengthLimit ) {
				editSummary += '...';
			}
		} else {
			editSummary += isDecline ? data.declineReasonTexts[ 0 ] : data.rejectReasonTexts[ 0 ];
		}

		if ( declineReason2 ) {
			editSummary += ' and ';
			if ( declineReason2 === 'reason' ) {
				editSummary += data.declineTextarea.substring( 0, lengthLimit );
				if ( data.declineTextarea.length > lengthLimit ) {
					editSummary += '...';
				}
			} else {
				editSummary += data.declineReasonTexts[ 1 ];
			}
		}

		afchPage.edit( {
			contents: text.get(),
			summary: editSummary
		} );

		if ( data.notifyUser ) {
			afchSubmission.getSubmitter().done( function ( submitter ) {
				var userTalk = new AFCH.Page( ( new mw.Title( submitter, 3 ) ).getPrefixedText() ),
					shouldTeahouse = data.inviteToTeahouse ? $.Deferred() : false;

				// Check categories on the page to ensure that if the user has already been
				// invited to the Teahouse, we don't invite them again.
				if ( data.inviteToTeahouse ) {
					userTalk.getCategories( /* useApi */ true ).done( function ( categories ) {
						var hasTeahouseCat = false,
							teahouseCategories = [
								'Category:Wikipedians who have received a Teahouse invitation',
								'Category:Wikipedians who have received a Teahouse invitation through AfC'
							];

						$.each( categories, function ( _, cat ) {
							if ( teahouseCategories.indexOf( cat ) !== -1 ) {
								hasTeahouseCat = true;
								return false;
							}
						} );

						shouldTeahouse.resolve( !hasTeahouseCat );
					} );
				}

				$.when( shouldTeahouse ).then( function ( teahouse ) {
					var message;
					if ( isDecline ) {
						message = AFCH.msg.get( 'declined-submission', {
							$1: AFCH.consts.pagename,
							$2: afchSubmission.shortTitle,
							$3: ( declineReason === 'cv' || declineReason2 === 'cv' ) ?
								'yes' : 'no',
							$4: declineReason,
							$5: newParams[ '3' ] || '',
							$6: declineReason2 || '',
							$7: newParams.details2 || '',
							$8: ( declineReason === 'reason' || declineReason2 === 'reason' ) ?
								'' : data.declineTextarea
						} );
					} else {
						message = AFCH.msg.get( 'rejected-submission', {
							$1: AFCH.consts.pagename,
							$2: afchSubmission.shortTitle,
							$3: data.rejectReason[ 0 ],
							$4: '',
							$5: data.rejectReason[ 1 ] || '',
							$6: '',
							$7: data.rejectTextarea
						} );
					}

					if ( teahouse ) {
						message += '\n\n' + AFCH.msg.get( 'teahouse-invite' );
					}

					AFCH.actions.notifyUser( submitter, {
						message: message,
						summary: 'Notification: Your [[' + AFCH.consts.pagename + '|Articles for Creation submission]] has been declined'
					} );
				} );
			} );
		}

		// Log CSD if necessary
		if ( data.csdSubmission ) {
			// FIXME: Only get submitter if needed...?
			afchSubmission.getSubmitter().done( function ( submitter ) {
				AFCH.actions.logCSD( {
					title: afchPage.rawTitle,
					reason: declineReason === 'cv' ? '[[WP:G12]] ({{tl|db-copyvio}})' :
						'{{tl|db-reason}} ([[WP:AFC|Articles for creation]])',
					usersNotified: data.notifyUser ? [ submitter ] : []
				} );
			} );
		}
	}

	function handleComment( data ) {
		var text = data.afchText;

		afchSubmission.addNewComment( data.commentText );
		text.updateAfcTemplates( afchSubmission.makeWikicode() );

		text.cleanUp();

		afchPage.edit( {
			contents: text.get(),
			summary: 'Commenting on submission'
		} );

		if ( data.notifyUser ) {
			afchSubmission.getSubmitter().done( function ( submitter ) {
				AFCH.actions.notifyUser( submitter, {
					message: AFCH.msg.get( 'comment-on-submission',
						{ $1: AFCH.consts.pagename } ),
					summary: 'Notification: I\'ve commented on [[' + AFCH.consts.pagename + '|your Articles for Creation submission]]'
				} );
			} );
		}
	}

	function handleSubmit( data ) {
		var text = data.afchText,
			submitter = $.Deferred(),
			submitType = data.submitType;

		if ( submitType === 'other' ) {
			submitter.resolve( data.submitterName );
		} else if ( submitType === 'self' ) {
			submitter.resolve( AFCH.consts.user );
		} else if ( submitType === 'creator' ) {
			afchPage.getCreator().done( function ( user ) {
				submitter.resolve( user );
			} );
		} else {
			// Custom selected submitter
			submitter.resolve( data.submitType );
		}

		submitter.done( function ( submitter ) {
			afchSubmission.setStatus( '', { u: submitter } );

			text.updateAfcTemplates( afchSubmission.makeWikicode() );
			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Submitting'
			} );

		} );

	}

	function handleCleanup() {
		prepareForProcessing( 'Cleaning' );

		afchPage.getText( false ).done( function ( rawText ) {
			var text = new AFCH.Text( rawText );

			// Even though we didn't modify them, still update the templates,
			// because the order may have changed/been corrected
			text.updateAfcTemplates( afchSubmission.makeWikicode() );

			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Cleaning up submission'
			} );
		} );
	}

	function handleMark( unmark ) {
		var actionText = ( unmark ? 'Unmarking' : 'Marking' );

		prepareForProcessing( actionText, 'mark' );

		afchPage.getText( false ).done( function ( rawText ) {
			var text = new AFCH.Text( rawText );

			if ( unmark ) {
				afchSubmission.setStatus( '', { reviewer: false, reviewts: false } );
			} else {
				afchSubmission.setStatus( 'r', {
					reviewer: AFCH.consts.user,
					reviewts: '{{subst:REVISIONTIMESTAMP}}'
				} );
			}

			text.updateAfcTemplates( afchSubmission.makeWikicode() );
			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: actionText + ' submission as under review'
			} );
		} );
	}

	function handleG13() {
		// We start getting the creator now (for notification later) because ajax is
		// radical and handles simultaneous requests, but we don't let it delay tagging
		var gotCreator = afchPage.getCreator();

		// Update the display
		prepareForProcessing( 'Requesting', 'g13' );

		// Get the page text and the last modified date (cached!) and tag the page
		$.when(
			afchPage.getText( false ),
			afchPage.getLastModifiedDate()
		).then( function ( rawText, lastModified ) {
			var text = new AFCH.Text( rawText );

			// Add the deletion tag and clean up for good measure
			text.prepend( '{{db-g13|ts=' + AFCH.dateToMwTimestamp( lastModified ) + '}}\n' );
			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Tagging abandoned [[Wikipedia:Articles for creation|Articles for creation]] draft ' +
					'for speedy deletion under [[WP:G13|G13]]'
			} );

			// Now notify the page creator as well as any and all previous submitters
			$.when( gotCreator ).then( function ( creator ) {
				var usersToNotify = [ creator ];

				$.each( afchSubmission.submitters, function ( _, submitter ) {
					// Don't notify the same user multiple times
					if ( usersToNotify.indexOf( submitter ) === -1 ) {
						usersToNotify.push( submitter );
					}
				} );

				$.each( usersToNotify, function ( _, user ) {
					AFCH.actions.notifyUser( user, {
						message: AFCH.msg.get( 'g13-submission',
							{ $1: AFCH.consts.pagename } ),
						summary: 'Notification: [[WP:G13|G13]] speedy deletion nomination of [[' + AFCH.consts.pagename + ']]'
					} );
				} );

				// And finally log the CSD nomination once all users have been notified
				AFCH.actions.logCSD( {
					title: afchPage.rawTitle,
					reason: '[[WP:G13]] ({{tl|db-afc}})',
					usersNotified: usersToNotify
				} );
			} );
		} );
	}

	function handlePostponeG13( data ) {
		var postponeCode,
			text = data.afchText,
			rawText = text.get(),
			postponeRegex = /\{\{AfC postpone G13\s*(?:\|\s*(\d*)\s*)?\}\}/ig;
		match = postponeRegex.exec( rawText );

		// First add the postpone template
		if ( match ) {
			if ( match[ 1 ] !== undefined ) {
				postponeCode = '{{AfC postpone G13|' + ( parseInt( match[ 1 ] ) + 1 ) + '}}';
			} else {
				postponeCode = '{{AfC postpone G13|2}}';
			}
			rawText = rawText.replace( match[ 0 ], postponeCode );
		} else {
			rawText += '\n{{AfC postpone G13|1}}';
		}

		text.set( rawText );

		// Then add the comment if entered
		if ( data.commentText ) {
			afchSubmission.addNewComment( data.commentText );
			text.updateAfcTemplates( afchSubmission.makeWikicode() );
		}

		text.cleanUp();

		afchPage.edit( {
			contents: text.get(),
			summary: 'Postponing [[WP:G13|G13]] speedy deletion'
		} );
	}

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
