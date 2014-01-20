//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/submissions.js]]

( function ( AFCH, $, mw ) {
	var $afchReviewPanel;

	AFCH.Page.prototype.isG13Elgibile = function () {
		// older than six months FIXME
		if ( this.getLastModifiedDate() ) {

		}
	}

	AFCH.Page.prototype.getAFCTemplates = function () {
		// FIXME: Is this the best place for this?
		// Should we have a designated AFCH.Submission class
		// instead, perhaps? That makes more sense.
	}

	function addMessages() {
		AFCH.msg.set( {
			'accept': 'Accept',
			'decline': 'Decline',
		} );
	}

	function setupReviewPanel() {
		var $buttonWrapper = $( '<div>' )
				.addClass( 'afch-actions' ),
			$acceptButton = $( '<button>' )
				.addClass( 'accept' )
				.text( 'Accept' );
			$declineButton,
			$commentButton,
			;

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
		})

} )( AFCH, jQuery, mediawiki );
//</nowiki>
