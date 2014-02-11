//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/submissions.js]]

( function ( AFCH, $, mw ) {
	var $afchReviewPanel,
		thePage,
		theSubmission;

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

		// Holds all of the {{afc submission}} templates that still
		// apply to the page
		this.templates = [];
	};

	/**
	 * Parses a submission, writing its current status and data to various properties
	 * @return {$.Deferred} Resolves when submission parsed successfully
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
				deferred.resolve();
			} );

		} );
	};

	/**
	 * Internal function
	 * @param {array} templates list of templates to parse
	 * @return {bool} [description]
	 */
	AFCH.Submission.prototype.parseDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		var sub = this,
			submissionTemplates = [];

		$.each( templates, function ( _, template ) {
			if ( template.target.toLowerCase() === 'afc submission' ) {
				submissionTemplates.push( {
					status: template.params.getAndDelete( '1' ).toLowerCase(),
					timestamp: +template.params.getAndDelete( 'ts' ),
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
			return true;
		} );

		this.templates = submissionTemplates;
		return true;
	};

	AFCH.Submission.prototype.updateAttributesAfterParse = function () {
		this.isCurrentlySubmitted = this.isPending || this.isUnderReview;
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
		this.getLastModifiedDate().done( function ( lastEdited ) {
			var timeNow = new Date(),
				sixMonthsAgo = ( new Date() ).setMonth( timeNow.getMonth() - 6 );

			deferred.resolve( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) );
		} );

		return deferred;
	};

	AFCH.Submission.prototype.setStatus = function ( s ) {
		var relevantTemplate = this.templates[0];

		if ( [ 'd', 't', 'r', '' ].indexOf( s ) === -1 ) {
			// Unrecognized status
			return false;
		}

		// If there are no templates on the page, generate a new one
		if ( !relevantTemplate ) {
			this.makeNewTemplate();
			relevantTemplate = this.templates[0];
		}

		// Now set the actual status
		relevantTemplate.status = s;

		// And finally reparse everything
		this.parseDataFromTemplates( this.templates );

		return true;
	};

	/**
	 * Add a new template to the beginning of this.templates
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.makeNewTemplate = function () {
		this.templates.unshift( {
			status: '',
			// FIXME: Create some sort of type which represents a "now" timestamp,
			// in other words that evaluates to new Date() or somethin' when compared
			// in JS, but when it's outputted in makeWikicode will be {{REVISIONTIMESTAMP}}
			// or a related template. Trippy, indeed. ALSO, support this functionality in
			// parse()...
			timestamp: 0,
			params: {}
		} );
		return true;
	};

	function addMessages() {
		AFCH.msg.set( {
			// FIXME
		} );
	}

	function setupReviewPanel() {
		var $buttonWrapper = $( '<div>' )
				.addClass( 'afch-actions' ),
			$acceptButton = $( '<button>' )
				.addClass( 'accept' )
				.text( 'Accept' ),
			$declineButton,
			$commentButton;

		/* global */
		thePage = new AFCH.Page( AFCH.consts.pagename );
		/* global */
		theSubmission = new AFCH.Submission( thePage );

		// Parse; when done, append the buttons
		theSubmission.parse().done( function () {
			// FIXME: Do this conditionally
			$buttonWrapper.append(
				$acceptButton,
				$declineButton,
				$commentButton
			);
		} );

		AFCH.initFeedback( $afchReviewPanel, 'article review' );
	}

	addMessages();

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

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
