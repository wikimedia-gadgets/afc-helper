// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {
		/**
		 * AFCH.Preferences is a mechanism for accessing and altering user
		 * preferences in regards to the script.
		 *
		 * Preferences are edited by the user via a jquery.ui.dialog and are
		 * saved and persist for the user using AFCH.userData.
		 *
		 * Typical usage:
		 *  AFCH.preferences = new AFCH.Preferences();
		 *  AFCH.preferences.initLink( $( '.put-prefs-link-here' ) );
		 *
		 * @type {Object}
		 */
		Preferences: function () {
			const prefs = this;

			/**
			 * Default values for user preferences; details for each preference can be
			 * found inline in `templates/tpl-preferences.html`.
			 *
			 * @type {Object}
			 */
			this.prefDefaults = {
				autoOpen: false,
				logCsd: true,
				launchLinkPosition: 'p-cactions',
				logAfc: true,
				noWatch: false,
				autoSubscribe: false
			};

			/**
			 * Current user's preferences
			 *
			 * @type {Object}
			 */
			this.prefStore = $.extend( {}, this.prefDefaults, AFCH.userData.get( 'preferences', {} ) );

			/**
			 * Initializes the preferences modification dialog
			 */
			this.initDialog = function () {
				const $spinner = $.createSpinner( {
					size: 'large',
					type: 'block'
				} ).css( 'padding', '20px' );

				if ( !this.$dialog ) {
					// Initialize the $dialog div
					this.$dialog = $( '<div>' );
				}

				// Until we finish lazy-loading the prefs interface,
				// show a spinner in its place.
				this.$dialog.empty().append( $spinner );

				this.$dialog.dialog( {
					width: 500,
					autoOpen: false,
					title: 'AFCH Preferences',
					modal: true,
					buttons: [
						{
							text: 'Cancel',
							click: function () {
								prefs.$dialog.dialog( 'close' );
							}
						},
						{
							text: 'Save preferences',
							click: function () {
								prefs.save();
								prefs.$dialog.empty().append( $spinner );
							}
						}
					]
				} );

				// If we've already fetched the template, render immediately
				if ( this.views ) {
					this.renderMain();
				} else {
					// Otherwise, load the template file and *then* render
					$.ajax( {
						type: 'GET',
						url: AFCH.consts.baseurl + '-tpl-preferences.js',
						dataType: 'text'
					} ).done( ( data ) => {
						prefs.views = new AFCH.Views( data );
						prefs.renderMain();
					} );
				}
			};

			/**
			 * Renders the main preferences menu in the $dialog
			 */
			this.renderMain = function () {
				if ( !( this.views && this.$dialog ) ) {
					return;
				}

				// Empty the dialog and render the preferences view. Provides the values of all
				// the preferences as variables, as well as an additional few used in other locations.
				this.$dialog.empty().append(
					this.views.renderView( 'preferences', $.extend( {}, this.prefStore, {
						userAgent: window.navigator.userAgent
					} ) )
				);

				// Manually handle selecting the desired value in <select> menus
				this.$dialog.find( 'select' ).each( function () {
					const $select = $( this ),
						id = $select.attr( 'id' ),
						value = prefs.prefStore[ id ];
					$select.find( 'option[value="' + value + '"]' ).prop( 'selected', true );
				} );
			};

			/**
			 * Updates prefs based on data in the dialog which
			 * is created in AFCH.preferences.init().
			 */
			this.save = function () {
				// First, hide the buttons so the user won't start multiple actions
				this.$dialog.dialog( { buttons: [] } );

				// Now update the prefStore
				$.extend( this.prefStore, AFCH.getFormValues( this.$dialog.find( '.afch-input' ) ) );

				// Set the new userData value
				AFCH.userData.set( 'preferences', this.prefStore ).done( () => {
					// When we're done, close the dialog and notify the user
					prefs.$dialog.dialog( 'close' );
					mw.notify( 'AFCH: Preferences saved successfully! They will take effect when the current page is ' +
						'reloaded or when you browse to another page.' );
				} );
			};

			/**
			 * Adds a link to launch the preferences modification dialog
			 *
			 * @param {jQuery} $element element to append the link to
			 * @param {string} linkText text to display in the link
			 */
			this.initLink = function ( $element, linkText ) {
				$( '<span>' )
					.text( linkText || 'Update preferences' )
					.addClass( 'preferences-link link' )
					.appendTo( $element )
					.on( 'click', () => {
						prefs.initDialog();
						prefs.$dialog.dialog( 'open' );
					} );
			};
		}
	} );

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
