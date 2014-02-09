//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/submissions.js]]

( function ( AFCH, $, mw ) {
	var $afchReviewPanel,
		thePage,
		theSubmission;

	AFCH.Page.prototype.isG13Eligible = function () {
		var deferred = $.Deferred();
		// A page is eligible if it has not been modified in 6 months
		this.getLastModifiedDate().done( function ( lastEdited ) {
			var timeNow = new Date(),
				sixMonthsAgo = ( new Date() ).setMonth( timeNow.getMonth() - 6 );
			if ( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) ) {
				deferred.resolve( true );
			}
			deferred.resolve( false );
		} );
		return deferred;
	};

	AFCH.Submission = function ( /* Page */ page ) {
		this.Page = page;
		this.isCurrentlySubmitted = false;
		this.parse( page );
	};

	AFCH.Submission.prototype.isG13Eligible = function () {
		this.Page.isG13Eligible().done( function ( eligible ) {
			return ( eligible && this.isCurrentlySubmitted === false );
		} );
	};

	AFCH.Submission.prototype.parse = function ( page ) {
		// Simply find the submission templates, parse them for applicable data,
		// set some variables, and voila! Simply, right?
		var sub = this;

		// Get the page text
		page.getText().done( function ( text ) {

			// Then get all templates
			AFCH.parseTemplates( text ).done( function ( templates ) {

				// FIXME: Finish this...no idea what i was doing...
				// Represent each AfC submission template as an object.
				var submissionTemplates = [];
				$.each( templates, function ( _, template ) {
					var tdata;
					if ( template.target.toLowerCase() === 'afc submission' ) {
						submissionTemplates.push( {
							status: template.params['1'],
							timestamp: template.params.ts
						} );
					}
				} );

			} );
		} );
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

		// FIXME: Do this conditionally
		$buttonWrapper.append(
			$acceptButton,
			$declineButton,
			$commentButton
		);

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
