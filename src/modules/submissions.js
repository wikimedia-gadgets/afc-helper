//<nowiki>
( function ( AFCH, $, mw ) {
	var $afchLaunchLink, $afch, $afchWrapper,
		afchPage, afchSubmission, afchViews, afchViewer;

	AFCH.log( 'submissions.js executing...' );

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
		this.shortTitle = this.page.title.getMainText().match( /([^\/]+$)/ )[1];

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
	};

	/**
	 * Parses a submission, writing its current status and data to various properties
	 * @return {$.Deferred} Resolves with the submission when parsed successfully
	 */
	AFCH.Submission.prototype.parse = function () {
		var sub = this,
			deferred = $.Deferred();

		// Get the page text
		this.page.getText().done( function ( text ) {

			// Then get all templates and parse them
			AFCH.parseTemplates( text ).done( function ( templates ) {
				sub.loadDataFromTemplates( templates );
				sub.sortAndParseInternalData();
				deferred.resolve( sub );
			} );

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
			if ( name  === 'afc submission' ) {
				submissionTemplates.push( {
					status: AFCH.getAndDelete( template.params, '1').toLowerCase(),
					timestamp: +AFCH.getAndDelete( template.params, 'ts' ),
					params: template.params
				} );
			} else if ( name === 'afc comment' ) {
				commentTemplates.push( {
					// If we can't find a timestamp, set it to unicorns, because everyone
					// knows that unicorns always come first.
					timestamp: +AFCH.parseForTimestamp( template.params['1'] ) || 'unicorns',
					text: template.params['1']
				} );
			}
		} );

		this.templates = submissionTemplates;
		this.comments = commentTemplates;
	};

	/**
	 * Sort the internal lists of AFC submission and Afc comment templates
\	 */
	AFCH.Submission.prototype.sortAndParseInternalData = function () {
		var sub = this,
			submissionTemplates = this.templates,
			commentTemplates = this.comments;

		function timestampSortHelper ( a, b ) {
			// If we're passed something that's not a number --
			// for example, {{REVISIONTIMESTAMP}} -- just sort it
			// first and be done with it.
			if ( isNaN( a.timestamp ) ) {
				return -1;
			} else if ( isNaN( b.timestamp ) ) {
				return 1;
			}

			// Otherwise just sort normally
			return b.timestamp - a.timestamp;
		}

		// Sort templates by timestamp; most recent are first
		submissionTemplates.sort( timestampSortHelper );
		commentTemplates.sort( timestampSortHelper );

		// Process the submission templates in order, from the most recent to
		// the oldest. In the process, we remove unneeded templates (for example,
		// a draft tag when it's already been submitted) and also set various
		// "isX" properties of the Submission.
		submissionTemplates = $.grep( submissionTemplates, function ( template ) {
			switch ( template.status ) {
				// Declined
				case 'd':
					if ( !sub.isPending && !sub.isDraft && !sub.isUnderReview ) {
						sub.isDeclined = true;
					}
					break;
				// Draft
				case 't':
					// If it's been submitted or declined, remove draft tag
					if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
						return false;
					}
					sub.isDraft = true;
					break;
				// Under review
				case 'r':
					if ( !sub.isPending && !sub.isDeclined ) {
						sub.isUnderReview = true;
					}
					break;
				// Pending
				default:
					// Remove duplicate pending templates or a redundant
					// pending template when the submission has already been
					// declined / is already under review
					if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
						return false;
					}
					sub.isPending = true;
					sub.isDraft = false;
					sub.isUnderReview = false;
					break;
			}

			// Save the parameter data. Don't overwrite parameters
			// that are already set, because we're going newest
			// to oldest.
			sub.params = $.extend( template.params, sub.params );

			return true;
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
		var output = [];

		// Submission templates go first
		$.each( this.templates, function ( _, template ) {
			var tout = '{{AFC submission|' + template.status +
				'|ts=' + template.timestamp;

			$.each( template.params, function ( key, value ) {
				tout += '|' + key + '=' + value;
			} );

			tout += '}}';
			output.push( tout );
		} );

		// Then comment templates
		$.each( this.comments, function ( _, comment ) {
			output.push( '{{AFC comment|1=' + comment.text + '}}' );
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

		// Not currently submitted
		if ( this.isCurrentlySubmitted ) {
			deferred.resolve( false );
		}

		// And not been modified in 6 months
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
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.setStatus = function ( newStatus ) {
		var relevantTemplate = this.templates[0];

		if ( [ 'd', 't', 'r', '' ].indexOf( newStatus ) === -1 ) {
			// Unrecognized status
			return false;
		}

		// If there are no templates on the page, generate a new one
		// (addNewTemplate handles the reparsing)
		if ( !relevantTemplate ) {
			this.addNewTemplate( { status: newStatus } );
		} else {
			// Just modify the top template on the stack and then reparse
			relevantTemplate.status = s;
			this.parseDataFromTemplates( this.templates );
		}

		return true;
	};

	/**
	 * Add a new template to the beginning of this.templates
	 * @param {object} data object with properties of template
	 *                      - status (default: '')
	 *                      - timestamp (default: '{{subst:REVISIONTIMESTAMP}}')
	 *                      - params (default: {})
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.addNewTemplate = function ( data ) {
		this.templates.unshift( $.extend( {
			status: '',
			timestamp: '{{subst:REVISIONTIMESTAMP}}',
			params: {}
		}, data ) );

		// Reparse :P
		this.sortAndParseInternalData();

		return true;
	};

	/**
	 * Add a new comment to the beginning of this.comments
	 * @param {object} data object with properties of template
	 *                      - text (default: '')
	 *                      - timestamp (if not specified, we parse text for
	 *                                   a timestamp instead)
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.addNewComment = function ( data ) {
		this.comments.unshift( $.extend( {
			// Unicorns are explained in loadDataFromTemplates()
			timestamp: +AFCH.parseForTimestamp( data.text ) || 'unicorns',
			text: ''
		}, data ) );

		// Reparse :P
		this.sortAndParseInternalData();

		return true;
	};

	// This creates the link in the header which allows
	// users to launch afch. When launched, the link fades
	// away, like a unicorn.
	$afchLaunchLink = $( '<span>' )
		.attr( 'id', 'afch-open' )
		.appendTo( '#firstHeading' )
		.text( 'Review submission »' )
		.click( function () {
			$( this ).fadeOut();
			createAFCHInstance();
		} );


	function createAFCHInstance () {
		/**
		 * global; wraps ALL afch-y things
		 */
		$afch = $( '<div>' )
			.attr( 'id', 'afch' )
			.prependTo( '#mw-content-text' )
			.append(
				$( '<div>' )
					.attr( 'id', 'afchLeft' )
					.addClass( 'top-bar-element' )
					.append(
						// Back link appears based on context
						$( '<span>' )
							.attr( 'id', 'afchBackLink' )
							.html( '&#8592; | ' ) // back arrow
							.addClass( 'hidden' )
							.click( function () {
								if ( afchViewer.loadPrevious ) {
									afchViewer.loadPrevious();
									$( this ).addClass( 'hidden' );
								}
							} )
					),

				// Include the close link in the upper right
				$( '<div>' )
					.attr( 'id', 'afchClose' )
					.addClass( 'top-bar-element' )
					.html( '&times;' )
					.click( function () {
						// DIE DIE DIE
						$afch.remove();
						// Show the launch link again
						$afchLaunchLink.fadeIn();
					} )
			);

		/**
		 * global; wrapper for specific afch panels
		 */
		$afchWrapper = $( '<div>' )
			.attr( 'id', 'afchPanelWrapper' )
			.appendTo( $afch )
			.append(
				// Build splash panel in JavaScript rather than via
				// a template so we don't have to wait for the
				// HTTP request to go through
				$( '<div>' )
						.attr( 'id', 'afchReviewPanel' )
						.addClass( 'splash' )
						.append(
							$( '<div>' )
								.attr( 'id', 'afchInitialHeader' )
								.text( 'AFCH v' + AFCH.consts.version + ' / ' + AFCH.consts.versionName )
						)
				);

		// Now set up the review panel and replace it with
		// actually content, not just a splash screen
		setupReviewPanel();
	}

	function setupReviewPanel () {
		// Store this to a variable so we can wait for its success
		var loadViews = $.ajax( {
				type: 'GET',
				url: AFCH.consts.baseurl + '/tpl-submissions.js',
				dataType: 'text'
			} ).done( function ( data ) {
				/* global */
				afchViews = new AFCH.Views( data );
				/* global */
				afchViewer = new AFCH.Viewer( afchViews, $afchWrapper );
			} );

		/* global */
		afchPage = new AFCH.Page( AFCH.consts.pagename );

		/* global */
		afchSubmission = new AFCH.Submission( afchPage );

		// Set up messages for later
		setMessages();

		// Parse the page and load the view templates. When done,
		// continue with everything else.
		$.when(
			afchSubmission.parse(),
			loadViews
		).then( function ( submission ) {
			AFCH.log( 'rendering main view...' );

			// Render the base buttons view
			loadView( 'main', {
				title: submission.shortTitle,
				accept: submission.isCurrentlySubmitted,
				decline: submission.isCurrentlySubmitted,
				comment: submission.isCurrentlySubmitted,
				submit: !submission.isCurrentlySubmitted,
				version: AFCH.consts.version,
				versionName: AFCH.consts.versionName
			} );

			// Add the feedback link to the left panel
			AFCH.initFeedback( '#afchLeft', 'article review' );

			// Set up click handlers
			$( '#afchAccept' ).click( showAcceptOptions );
			$( '#afchDecline' ).click( showDeclineOptions );
			$( '#afchComment' ).click( showCommentOptions );
			$( '#afchSubmit' ).click( showSubmitOptions );
			$( '#afchG13' ).click( showG13Options );

			// Get G13 eligibility and when known, display the button...
			// but don't hold up the rest of the loading to do so
			afchSubmission.isG13Eligible().done( function ( eligible ) {
				$( '#afchG13' ).toggleClass( 'hidden', !eligible );
			} );

		} );
	}

	/**
	 * Stores useful strings to AFCH.msg
	 */
	function setMessages () {
		AFCH.msg.set( {
			// $1 = article name
			// $2 = article class or '' if not available
			'accepted-submission': '{{subst:Afc talk|$1|class=$2|sig=~~~~}}',

			// $1 = article name
			// $2 = copyright violation ('yes'/'no')
			'declined-submission': '{{subst:Afc decline|$1|cv=$2|sig=yes}}'
		} );
	}

	/**
	 * Adds handler for when the accept/decline/etc form is submitted
	 * that calls a given function and passes an object to the function
	 * containing data from all .afch-input elements in the dom
	 *
	 * @param {Function} fn function to call with data
	 */
	function addFormSubmitHandler ( fn ) {
		$( '#afchSubmit' ).click( function () {
			var data = {};

			$( '.afch-input' ).each( function ( _, element ) {
				data[element.id] = $( element ).val();
			} );

			fn( data );
		} );
	}

	function loadView ( name, data ) {
		// Show the back button if we're not loading the main view
		$( '#afchBackLink' ).toggleClass( 'hidden', name === 'main' );
		afchViewer.loadView( name, data );
	}

	// These functions show the options before doing something
	// to a submission.

	function showAcceptOptions () {
		loadView( 'accept', {
			newTitle: afchSubmission.shortTitle
		} );
		addFormSubmitHandler( handleAccept );
	}

	function showDeclineOptions () {
		loadView( 'decline', {} );
		addFormSubmitHandler( handleDecline );
	}

	function showCommentOptions () {
		loadView( 'comment', {} );
		addFormSubmitHandler( handleComment );
	}

	function showSubmitOptions () {
		loadView( 'submit', {} );
		addFormSubmitHandler( handleSubmit );
	}

	function showG13Options () {
		loadView( 'g13', {} );
		addFormSubmitHandler( handleG13 );
	}

	// These functions actually perform a given action using data passed
	// in the `data` parameter.

	/**
	 * handleAccept
	 * @param {object} data
	 *                  - newTitle
	 *                  - notifyUser
	 *                  - newClass
	 */
	function handleAccept ( data ) {
		AFCH.actions.movePage( afchPage, data.newTitle )
			.done( function () {
				if ( data.notifyUser ) {
					AFCH.actions.notifyUser( data.notifyUser, {
						msg: AFCH.msg.get( 'accepted-submission',
							{ '$1': data.newTitle, '$2': data.newClass } )
					} );
				}
			} )
			.fail( function () {
				return;
			} );
	}

	function handleDecline ( data ) {
		return;
	}

	function handleComment ( data ) {
		return;
	}

	function handleSubmit ( data ) {
		return;
	}

	function handleG13 ( data ) {
		return;
	}

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
