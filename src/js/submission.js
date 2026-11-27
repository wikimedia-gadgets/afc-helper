// <nowiki>
( function ( AFCH, $, mw ) {
	if ( typeof inUnitTestEnvironment === 'undefined' ) {
		// Small optimization. Don't load the submission module if not needed on this page.
		if ( mw.config.get( 'wgArticleId' ) === 0 ||
			mw.config.get( 'wgPageContentModel' ) !== 'wikitext' ) {
			return;
		}
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
	 * just the page creator. Handles renamed submitters.
	 *
	 * @return {jQuery.Deferred} resolves with user
	 */
	AFCH.Submission.prototype.getSubmitter = function () {
		const user = this.params.u;

		if ( !user ) {
			return this.page.getCreator();
		}

		return AFCH.api.get( {
			action: 'query',
			list: 'users',
			formatversion: 2,
			ususers: user
		} ).then( ( resp ) => {
			// A historical rename may refer to a different account that used this name.
			if ( resp.query.users[ 0 ].missing === undefined ) {
				return user;
			}

			// Look for renamed users in the log.
			return AFCH.api.get( {
				action: 'query',
				list: 'logevents',
				formatversion: 2,
				letype: 'renameuser',
				lelimit: 1,
				letitle: 'User:' + user
			} ).then( ( resp ) => {
				const logevents = resp.query.logevents;

				if ( logevents.length ) {
					this.params.u = logevents[ 0 ].params.newuser;
					// Use recursion in case the user was renamed several times.
					return this.getSubmitter();
				}
				return user;
			} );
		} );
	};

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
