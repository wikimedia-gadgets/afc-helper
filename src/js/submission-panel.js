// <nowiki>
( function ( AFCH, $, mw ) {
	let $afchLaunchLink, $afch, $afchWrapper,
		afchPage, afchSubmission, afchViews, afchViewer;

	if ( typeof inUnitTestEnvironment === 'undefined' ) {
		if ( ![ 2, 118 ].includes( mw.config.get( 'wgNamespaceNumber' ) ) ) {
			return;
		}
		$( () => {
			if ( !AFCH.setup() ) {
				mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
					{ title: 'AFCH error' } );
				return;
			}
			// Do not offer review on nonexistent pages or non-wikitext pages.
			if ( !window.AFCH || mw.config.get( 'wgArticleId' ) === 0 ||
				mw.config.get( 'wgPageContentModel' ) !== 'wikitext' ) {
				return;
			}
			init();
		} );
	}

	function init() {
		// Add the launch link
		$afchLaunchLink = $( mw.util.addPortletLink( AFCH.prefs.launchLinkPosition, '#', 'Review (AFCH)',
			'afch-launch', 'Review submission using afc-helper', '1' ) );

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

		// If AFCH is destroyed via AFCH.destroy(), remove the window and launch link.
		AFCH.addDestroyFunction( () => {
			$afchLaunchLink.remove();

			if ( $afch && $afch.jquery ) {
				$afch.remove();
			}
		} );
	}

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
							.on( 'click', () => {
								// Reload the review panel
								spinnerAndRun( setupReviewPanel );
							} ),

						// On the right, a close button
						$( '<div>' )
							.addClass( 'close-link' )
							.html( '&times;' )
							.on( 'click', () => {
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
							.text( 'Loading AFCH ...' )
					)
			);

		// Now set up the review panel and replace it with actual content, not just a splash screen
		setupReviewPanel();

		// If the "Review" link is clicked again, just reload the main view
		$afchLaunchLink.on( 'click', () => {
			spinnerAndRun( setupReviewPanel );
		} );
	}

	function setupReviewPanel() {
		// Store this to a variable so we can wait for its success
		const loadViews = $.ajax( {
			type: 'GET',
			url: AFCH.consts.baseurl + '-tpl-submissions.js',
			dataType: 'text'
		} ).done( ( data ) => {
			afchViews = new AFCH.Views( data );
			afchViewer = new AFCH.Viewer( afchViews, $afchWrapper );
		} );

		afchPage = new AFCH.Page( AFCH.consts.pagename );
		afchSubmission = new AFCH.Submission( afchPage );

		// Set up messages for later
		setMessages();

		const submissionActions = new AFCH.SubmissionActions( {
			$afch: $afch,
			page: afchPage,
			submission: afchSubmission,
			prepareForProcessing: prepareForProcessing
		} );
		const submissionForms = new AFCH.SubmissionForms( {
			$afch: $afch,
			page: afchPage,
			submission: afchSubmission,
			loadView: loadView,
			prepareForProcessing: prepareForProcessing,
			checkForEditConflict: submissionActions.checkForEditConflict,
			showEditConflictMessage: submissionActions.showEditConflictMessage,
			handleAccept: submissionActions.handleAccept,
			handleAcceptOverRedirect: submissionActions.handleAcceptOverRedirect,
			handleDecline: submissionActions.handleDecline,
			handleComment: submissionActions.handleComment,
			handleSubmit: submissionActions.handleSubmit,
			handlePostponeG13: submissionActions.handlePostponeG13
		} );

		// Parse the page and load the view templates. When done,
		// continue with everything else.
		$.when(
			afchSubmission.parse(),
			loadViews
		).then( ( submission ) => {
			let extrasRevealed = false;

			// Render the base buttons view
			loadView( 'main', {
				title: submission.shortTitle,
				accept: submission.isCurrentlySubmitted,
				decline: submission.isCurrentlySubmitted,
				comment: true, // Comments are always okay!
				submit: !submission.isCurrentlySubmitted,
				alreadyUnderReview: submission.isUnderReview
			} );

			// Set up the extra options slide-out panel, which appears
			// when the user click on the chevron
			$afch.find( '#afchExtra .open' ).on( 'click', () => {
				const $extra = $afch.find( '#afchExtra' );

				if ( extrasRevealed ) {
					$extra.find( 'a' ).hide();
					$extra.stop().animate( { width: '20px' }, 100, 'swing', () => {
						extrasRevealed = false;
					} );
				} else {
					$extra.stop().animate( { width: '210px' }, 150, 'swing', () => {
						$extra.find( 'a' ).css( 'display', 'block' );
						extrasRevealed = true;
					} );
				}
			} );

			// Add preferences link
			AFCH.preferences.initLink( $afch.find( 'span.preferences-wrapper' ), 'preferences' );

			// Set up click handlers
			$afch.find( '#afchAccept' ).on( 'click', () => {
				spinnerAndRun( submissionForms.showAcceptOptions );
			} );
			$afch.find( '#afchDecline' ).on( 'click', () => {
				spinnerAndRun( submissionForms.showDeclineOptions );
			} );
			$afch.find( '#afchComment' ).on( 'click', () => {
				spinnerAndRun( submissionForms.showCommentOptions );
			} );
			$afch.find( '#afchSubmit' ).on( 'click', () => {
				spinnerAndRun( submissionForms.showSubmitOptions );
			} );
			$afch.find( '#afchClean' ).on( 'click', () => {
				submissionActions.handleCleanup();
			} );
			$afch.find( '#afchMark' ).on( 'click', () => {
				submissionActions.handleMark( /* unmark */ submission.isUnderReview );
			} );

			// Load warnings about the page, then slide them in
			AFCH.getSubmissionWarnings( {
				page: afchPage,
				submission: afchSubmission,
				views: afchViews,
				onUnmark: () => submissionActions.handleMark( true )
			} ).done( ( warnings ) => {
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
			submission.isG13Eligible().done( ( eligible ) => {
				$afch.find( '.g13-related' ).toggleClass( 'hidden', !eligible );
				$afch.find( '#afchG13' ).on( 'click', () => {
					submissionActions.handleG13();
				} );
				$afch.find( '#afchPostponeG13' ).on( 'click', () => {
					spinnerAndRun( submissionForms.showPostponeG13Options );
				} );
			} );
		} );
	}

	/**
	 * Stores useful strings to AFCH.msg
	 */
	function setMessages() {
		const headerBegin = '== Your submission at [[Wikipedia:Articles for creation|Articles for creation]]: ';
		AFCH.msg.set( {
			// $1 = article name
			// $2 = article class or '' if not available
			'accepted-submission': headerBegin +
				'[[$1]] has been accepted ==\n{{subst:Afc talk|$1|class=$2|sig=~~~~}}',

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
			'comment-on-submission': '{{subst:AfC notification|comment|article=$1}}',

			// $1 = article name
			'g13-submission': '{{subst:Db-afc-notice|$1}} ~~~~',

			'teahouse-invite': '{{subst:Wikipedia:Teahouse/AfC invitation|sign=~~~~}}'
		} );
	}

	/**
	 * Clear the viewer, set up the status log, and
	 * then update the button text
	 *
	 * @param {string} actionTitle optional, if there is no content available and the
	 *                             script has to load a new view, this will be its title
	 * @param {string} actionClass optional, if there is no content available and the
	 *                             script has to load a new view, this will be the class
	 *                             applied to it
	 */
	function prepareForProcessing( actionTitle, actionClass ) {
		let $content = $afch.find( '#afchContent' ),
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
		$( document ).on( 'ajaxStop', () => {
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
			// We need "new" here because Element uses "this." and needs the right context.
			// eslint-disable-next-line no-new
			new AFCH.status.Element( 'Continue to next $1 or $2 &raquo;', {
				$1: AFCH.makeLinkElementToCategory( 'Pending AfC submissions', 'random submission' ),
				$2: AFCH.makeLinkElementToCategory( 'AfC pending submissions by age/0 days ago', 'zero-day-old submission' )
			} );

			// Also, automagically reload the page in place
			$( '#mw-content-text' ).load( AFCH.consts.pagelink + ' #mw-content-text', () => {
				$afch.find( '#reloadLink' ).text( '(reload)' );
				// Fire the hook for new page content
				mw.hook( 'wikipage.content' ).fire( $( '#mw-content-text' ) );
			} );

			// Stop listening to ajaxStop events; otherwise these can stack up if
			// the user goes back to perform another action, for example
			$( document ).off( 'ajaxStop' );
		} );
	}

	/**
	 * Displays a spinner in the main content area and then
	 * calls the passed function
	 *
	 * @param {Function} fn function to call when spinner has been displayed
	 */
	function spinnerAndRun( fn ) {
		let $spinner, $container = $afch.find( '#afchContent' );

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
	 *
	 * @param {string} name view to be loaded
	 * @param {Object} data data to populate the view with
	 * @param {Function} callback function to call when view is loaded
	 */
	function loadView( name, data, callback ) {
		// Show the back button if we're not loading the main view
		$afch.find( '.back-link' ).toggleClass( 'hidden', name === 'main' );
		afchViewer.loadView( name, data );
		if ( callback ) {
			callback();
		}
	}

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
