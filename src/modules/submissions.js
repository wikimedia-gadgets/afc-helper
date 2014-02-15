//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/submissions.js]]
( function ( AFCH, $, mw ) {
	var $afchReviewPanel,
		thePage,
		theSubmission;
	AFCH.log( 'submissions.js executing...' );

	/**
	 * Represents an AfC submission and its status. Call submission.parse() to
	 * actually get the data.
	 *
	 * @param {AFCH.Page} page The submission page
	 */
	AFCH.Submission = function ( page ) {
		// The associated page
		this.page = page;

		// Various submission states, set in parse()
		this.isPending = false;
		this.isUnderReview = false;
		this.isDeclined = false;
		this.isDraft = false;

		// Set in updateAttributesAfterParse()
		this.isCurrentlySubmitted = false;

		// All parameters on the page, zipped up into one
		// pretty package. The most recent value for any given
		// parameter (based on `ts`) takes precedent.
		this.params = {};

		// Holds all of the {{afc submission}} templates that still
		// apply to the page
		this.templates = [];
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
				sub.parseDataFromTemplates( templates );
				sub.updateAttributesAfterParse();
				deferred.resolve( sub );
			} );

		} );

		return deferred;
	};

	/**
	 * Internal function
	 * @param {array} templates list of templates to parse
	 */
	AFCH.Submission.prototype.parseDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		var sub = this,
			submissionTemplates = [];

		$.each( templates, function ( _, template ) {
			if ( template.target.toLowerCase() === 'afc submission' ) {
				submissionTemplates.push( {
					status: AFCH.getAndDelete( template.params, '1').toLowerCase(),
					timestamp: +AFCH.getAndDelete( template.params, 'ts' ),
					params: template.params
				} );
			}
		} );

		// Sort templates by timestamp; most recent are first
		submissionTemplates.sort( function ( a, b ) {
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
		} );

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

		this.templates = submissionTemplates;
	};

	AFCH.Submission.prototype.updateAttributesAfterParse = function () {
		this.isCurrentlySubmitted = this.isPending || this.isUnderReview;
	};

	/**
	 * Pass it a string of text and the old AFC submission templates will be
	 * removed and the new ones (from makeWikicode) added to the top
	 * @param {string} text
	 * @return {string}
	 */
	AFCH.Submission.getUpdatedCodeFromText = function ( text ) {
		// FIXME: Awful regex to remove the old submission templates
		// This is bad. It works for most cases but has a hellish time
		// with some double nested templates or faux nested templates (for
		// example "{{hi|}}}" -- note the extra bracket). Ideally Parsoid
		// would just return the raw template text as well (currently
		// working on a patch for that, actually).
		text = text.replace( /\{\{AFC submission(?:[^{{}}]*|({{.*?}}*))*\}\}/gi, '' );
		text = this.makeWikicode() + '\n' + text;
		return text;
	};

	/**
	 * Converts the template data to a hunk of template wikicode
	 * @return {string}
	 */
	AFCH.Submission.prototype.makeWikicode = function () {
		var output = [];

		$.each( this.templates, function ( _, template ) {
			var tout = '{{AFC submission|' + template.status +
				'|ts=' + template.timestamp;

			$.each( template.params, function ( key, value ) {
				tout += '|' + key + '=' + value;
			} );

			tout += '}}';
			output.push( tout );
		} );

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
		this.parseDataFromTemplates( this.templates );

		return true;
	};

	$afchReviewPanel = $( '<div>' )
		.attr( 'id', 'afch' )
		.addClass( 'afch-loading' )
		.prependTo( '#mw-content-text' )
		// FIXME: Show a sexy loader graphic
		.text( 'AFCH is loading...' );

	// Set up the link which opens the interface
	$( '<span>' )
		.attr( 'id', 'afch-open' )
		.appendTo( '#firstHeading' )
		.text( 'Review submission »' )
		.on( 'click', function () {
			$afchReviewPanel.show( 'slide', { direction: 'down' } );
			setupReviewPanel();
		} );

	function setupReviewPanel () {
		/* global */
		thePage = new AFCH.Page( AFCH.consts.pagename );
		/* global */
		theSubmission = new AFCH.Submission( thePage );

		// Set up messages for later
		setMessages();

		// Parse; when done, append the buttons
		theSubmission.parse().done( function ( submission ) {
			var $buttonWrapper = $( '<div>' )
					.addClass( 'afch-actions' ),
				$acceptButton = $( '<a>' )
					.addClass( 'button accept' )
					.text( 'Accept' )
					.click( showAcceptOptions ),
				$declineButton = $( '<a>' )
					.addClass( 'button decline' )
					.text( 'Decline' )
					.click( showDeclineOptions ),
				$commentButton = $( '<a>' )
					.addClass( 'button comment' )
					.text( 'Comment' )
					.click( showCommentOptions ),
				$submitButton = $( '<a>' )
					.addClass( 'button submit' )
					.text( 'Submit' )
					.click( showSubmitOptions ),
				$g13Button = $( '<a>' )
					.addClass( 'button tag-g13' )
					.text( 'Tag for G13 deletion' )
					.click( showG13Options );

				$buttonWrapper.append(
					$acceptButton.toggleClass( 'show', submission.isCurrentlySubmitted ),
					$declineButton.toggleClass( 'show', submission.isCurrentlySubmitted ),
					$commentButton.toggleClass( 'show', submission.isCurrentlySubmitted ),
					$submitButton.toggleClass( 'show', !submission.isCurrentlySubmitted )
				);

				// Get G13 eligibility and when known, display the button...
				// but don't hold up the rest of the loading to do so
				theSubmission.isG13Eligible().done( function ( eligible ) {
					$g13Button
						.toggleClass( 'show', eligible )
						.appendTo( $buttonWrapper );
				} );
			} );

		// Add the feedback link
		AFCH.initFeedback( $afchReviewPanel, 'article review' );
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

	// These functions show the options before doing something
	// to a submission.

	function showAcceptOptions () {
		return;
	}

	function showDeclineOptions () {
		return;
	}

	function showCommentOptions () {
		return;
	}

	function showSubmitOptions () {
		return;
	}

	function showG13Options () {
		return;
	}

	/**
	 * Get the value of each ".afch-data-field" and store it to a dictionary,
	 * then call function specified by `fn` with a data object containing
	 * the grabbed data
	 */
	function getFormDataAndCall ( fn ) {
		$( '.afch-data-field' );
	}

	// The functions actually perform a given action using data passed
	// in the `data` parameter.

	/**
	 * handleAccept
	 * @param {object} data
	 *                  - newTitle
	 *                  - notifyUser
	 *                  - newClass
	 */
	function handleAccept ( data ) {
		AFCH.actions.movePage( thePage, data.newTitle )
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
