// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {

		/**
		 * Log anything to the console. Takes any number of parameters.
		 */
		log: function () {
			const args = Array.prototype.slice.call( arguments );

			if ( AFCH.consts.beta && console && console.log ) {
				args.unshift( 'AFCH:' );
				console.log.apply( console, args );
			}
		},

		/**
		 * Functions called when AFCH.destroy() is run
		 *
		 * @internal
		 * @type {Array}
		 */
		_destroyFunctions: [],

		/**
		 * Add a function to run when AFCH.destroy() is run
		 *
		 * @param {Function} fn
		 */
		addDestroyFunction: function ( fn ) {
			AFCH._destroyFunctions.push( fn );
		},

		/**
		 * Destroys all AFCH-y things. Subscripts can add custom
		 * destroy functions by running AFCH.addDestroyFunction( fn )
		 */
		destroy: function () {
			$.each( AFCH._destroyFunctions, ( _, fn ) => {
				fn();
			} );

			window.AFCH = false;
		},

		/**
		 * Prepares the AFCH gadget by setting constants and checking environment
		 *
		 * @return {boolean} Whether or not all setup functions executed successfully
		 */
		setup: function () {
			// Check requirements
			if ( 'ajax' in $.support && !$.support.ajax ) {
				AFCH.error = 'AFCH requires AJAX';
				return false;
			}

			AFCH.api = new mw.Api();

			// Set up the preferences interface
			AFCH.preferences = new AFCH.Preferences();
			AFCH.prefs = AFCH.preferences.prefStore;

			// Add more constants -- don't overwrite those already set, though
			AFCH.consts = $.extend( AFCH.consts, {
				// If true, the script will NOT modify actual wiki content and
				// will instead mock all such API requests (success assumed)
				mockItUp: AFCH.consts.mockItUp || false,

				// Full page name, "Wikipedia talk:Articles for creation/sandbox"
				pagename: mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),

				// Link to the current page, "/wiki/Wikipedia talk:Articles for creation/sandbox"
				pagelink: mw.util.getUrl(),

				// Used when status is disabled
				nullstatus: { update: function () {
					return;
				} },

				// Current user
				user: mw.user.getName(),

				// Edit tag
				tag: 'AFCH',

				// Require users to be on whitelist to use the script
				// Testwiki users don't need to be on it
				whitelistRequired: mw.config.get( 'wgDBname' ) !== 'testwiki',

				// Name of the whitelist page for reviewers
				whitelistTitle: 'Wikipedia:WikiProject Articles for creation/Participants'
			}, AFCH.consts );

			if ( window.afchSuppressDevEdits === false ) {
				AFCH.consts.mockItUp = false;
			}

			// Check whitelist if necessary, but don't delay loading of the
			// script for users who ARE allowed; rather, just destroy the
			// script instance when and if it finds the user is not listed
			if ( AFCH.consts.whitelistRequired ) {
				AFCH.checkWhitelist();
			}

			return true;
		},

		/**
		 * Check if the current user is allowed to use the helper script;
		 * if not, display an error and destroy AFCH
		 */
		checkWhitelist: function () {
			const user = AFCH.consts.user,
				whitelist = new AFCH.Page( AFCH.consts.whitelistTitle );
			whitelist.getText().done( ( text ) => {

				// sanitizedUser is user, but escaped for use in the regex.
				// Otherwise a user named ... would always be able to use
				// the script, so long as there was a user whose name was
				// three characters long on the list!
				let $howToDisable,
					sanitizedUser = user.replace( /[-[\]/{}()*+?.\\^$|]/g, '\\$&' ),
					userSysop = $.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) > -1,
					userNPP = $.inArray( 'patroller', mw.config.get( 'wgUserGroups' ) ) > -1,
					userOnWhitelist = ( new RegExp( '\\|\\s*' + sanitizedUser + '\\s*}' ) ).test( text ),
					userAllowed = userOnWhitelist || userSysop || userNPP;

				if ( !userAllowed ) {

					// If we can detect that the gadget is currently enabled,
					// offer a one-click "disable" link
					if ( mw.user.options.get( 'gadget-afchelper' ) === '1' ) {
						$howToDisable = $( '<span>' )
							.append( 'If you wish to disable the helper script, ' )
							.append( $( '<a>' )
								.text( 'click here' )
								.on( 'click', () => {
									// Submit the API request to disable the gadget.
									// Note: We don't use `AFCH.api` here, because AFCH has already
									// been destroyed due to the user not being on the whitelist!
									( new mw.Api() ).postWithEditToken( {
										action: 'options',
										change: 'gadget-afchelper=0'
									} ).done( () => {
										mw.notify( 'AFCH has been disabled successfully. If you wish to re-enable it in the ' +
											'future, you can do so via your Preferences by checking "Yet Another AFC Helper Script".' );
									} );
								} )
							)
							.append( '. ' );

					// Otherwise, AFCH is probably installed via common.js/skin.js:
					// offer links for easy access.
					} else {
						$howToDisable = $( '<span>' )
							.append( 'If you wish to disable the helper script, you will need to manually ' +
								'remove it from your ' )
							.append( AFCH.makeLinkElementToPage( 'Special:MyPage/common.js', 'common.js' ) )
							.append( ' or your ' )
							.append( AFCH.makeLinkElementToPage( 'Special:MyPage/skin.js', 'skin.js' ) )
							.append( 'page. ' );
					}

					// Finally, make and push the notification, then explode AFCH
					mw.notify(
						$( '<div>' )
							.append( 'AFCH could not be loaded because "' + user + '" is not listed on ' )
							.append( AFCH.makeLinkElementToPage( whitelist.rawTitle ) )
							.append( '. You can request access to the AfC helper script there. ' )
							.append( $howToDisable )
							.append( 'If you have any questions or concerns, please ' )
							.append( AFCH.makeLinkElementToPage( 'WT:AFCH', 'get in touch' ) )
							.append( '!' ),
						{
							title: 'AFCH error: user not listed',
							autoHide: false
						}
					);
					AFCH.destroy();
				}
			} );
		},

		/**
		 * Series of functions for logging statuses and whatnot
		 */
		status: {

			/**
			 * Represents the status container, created ub init()
			 */
			$container: false,

			/**
			 * Creates the status container
			 *
			 * @param {string|jQuery} location String/jQuery selector for where the
			 *                             status container should be prepended
			 */
			init: function ( location ) {
				AFCH.status.$container = $( '<div>' )
					.attr( 'id', 'afchStatus' )
					.addClass( 'afchStatus' )
					.prependTo( location || '#mw-content-text' );
			},

			/**
			 * Represents an element in the status container
			 *
			 * @param {string} initialText Initial text of the element
			 * @param {Object} substitutions key-value pairs of strings that should be replaced by something
			 *                               else. For example, { '$2': mw.user.getUser() }. If not redefined, $1
			 *                               will be equal to the current page name.
			 */
			Element: function ( initialText, substitutions ) {
				/**
				 * Replace the status element with new html content
				 *
				 * @param {jQuery|string} html Content of the element
				 *                              Can use $1 to represent the page name
				 */
				this.update = function ( html ) {
					// Convert to HTML first if necessary
					if ( html.jquery ) {
						html = AFCH.jQueryToHtml( html );
					}

					// First run the substutions
					$.each( this.substitutions, ( key, value ) => {
						// If we are passed a jQuery object, convert it to regular HTML first
						if ( value.jquery ) {
							value = AFCH.jQueryToHtml( value );
						}

						html = html.replace( key, value );
					} );
					// Then update the element
					this.$element.html( html );
				};

				/**
				 * Remove the element from the status container
				 */
				this.remove = function () {
					this.update( '' );
				};

				// Sanity check, there better be a status container
				if ( !AFCH.status.$container ) {
					AFCH.status.init();
				}

				if ( !substitutions ) {
					substitutions = { $1: AFCH.consts.pagelink };
				} else {
					substitutions = $.extend( {}, { $1: AFCH.consts.pagelink }, substitutions );
				}

				this.substitutions = substitutions;

				this.$element = $( '<li>' )
					.appendTo( AFCH.status.$container );

				this.update( initialText );
			}
		},

		/**
		 * A simple framework for getting/setting interface messages.
		 * Not every message necessarily needs to go through here. But
		 * it's nice to separate long messages from the code itself.
		 *
		 * @type {Object}
		 */
		msg: {
			/**
			 * AFCH messages loaded by default for all subscripts.
			 *
			 * @type {Object}
			 */
			store: {},

			/**
			 * Retrieve the text of a message, or a placeholder if the
			 * message is not set
			 *
			 * @param {string} key Message key
			 * @param {Object} substitutions replacements to make
			 * @return {string} Message value
			 */
			get: function ( key, substitutions ) {
				let text = AFCH.msg.store[ key ] || '<' + key + '>';

				// Perform substitutions if necessary
				if ( substitutions ) {
					$.each( substitutions, ( original, replacement ) => {
						text = text.replace(
							// Escape the original substitution key, then make it a global regex
							new RegExp( original.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' ), 'g' ),
							replacement
						);
					} );
				}

				return text;
			},

			/**
			 * Set a new message or messages
			 *
			 * @param {string | Object} key
			 * @param {string} value if key is a string, value
			 */
			set: function ( key, value ) {
				if ( typeof key === 'object' ) {
					$.extend( AFCH.msg.store, key );
				} else {
					AFCH.msg.store[ key ] = value;
				}
			}
		},

		/**
		 * Store persistent data for the user. Data is stored over
		 * several layers: window-locally, in a variable; broswer-locally,
		 * via localStorage, and finally not-so-locally-at-all, via
		 * mw.user.options.
		 *
		 * == REDUNDANCY, EXPLAINED ==
		 * The reason for this redundancy is because of an obnoxious
		 * little thing called caching. Ideally the script would simply
		 * use mw.user.options, but *apparently* MediaWiki doesn't always
		 * provide the most updated mw.user.options on page load -- in some
		 * instances, it will provide an stale, cached version instead.
		 * This is most certainly a MediaWiki bug, but in the meantime, we
		 * circumvent it by adding numerous layers of redundancy to the whole
		 * getup. In this manner, hopefully by the time we have to rely on
		 * mw.user.options, the cache will have been invalidated and the world
		 * won't explode. *sighs repeatedly* --Theopolisme, 26 May 2014
		 *
		 * @type {Object}
		 */
		userData: {
			/** @internal */
			_prefix: 'userjs-afch-',

			/**
			 * @internal
			 * This is used to cache the updated values of recently set
			 * (through AFCH.userData.set) options, since mw.user.options.get
			 * won't include items set after the page was first loaded.
			 * @type {Object}
			 */
			_optsCache: {},

			/**
			 * Set a value in the data store
			 *
			 * @param {string} key
			 * @param {Mixed} value
			 * @return {jQuery.Deferred} success
			 */
			set: function ( key, value ) {
				const deferred = $.Deferred(),
					fullKey = AFCH.userData._prefix + key,
					fullValue = JSON.stringify( value );

				// Update cache so AFCH.userData.get() will have updated
				// information if the page isn't reloaded first. If for
				// some reason the post fails...oh well...
				AFCH.userData._optsCache[ fullKey ] = fullValue;

				// Also update localStorage cache for more redundancy.
				// See note in AFCH.userData docs for why this is necessary.
				if ( window.localStorage ) {
					window.localStorage[ fullKey ] = fullValue;
				}

				AFCH.api.postWithEditToken( {
					action: 'options',
					optionname: fullKey,
					optionvalue: fullValue
				} ).done( ( data ) => {
					deferred.resolve( data );
				} );

				return deferred;
			},

			/**
			 * Gets a value from the data store
			 *
			 * @param {string} key
			 * @param {Mixed} fallback fallback if option not present
			 * @return {Mixed} value
			 */
			get: function ( key, fallback ) {
				let value,
					fullKey = AFCH.userData._prefix + key,
					cachedWindow = AFCH.userData._optsCache[ fullKey ],
					cachedLocal = window.localStorage && window.localStorage[ fullKey ];

				// Use cached value if possible, see explanation in AFCH.userData docs.
				value = cachedWindow || cachedLocal;

				if ( value ) {
					return JSON.parse( value );
				}

				// Otherwise just use mw.user.options (with fallback).
				return JSON.parse( mw.user.options.get( fullKey, JSON.stringify( fallback || false ) ) );
			}
		},

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
				// of the preferences as variables, as well as an additional few used in other locations.
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
		},

		/**
		 * Represents a series of "views", aka templateable thingamajigs.
		 * When creating a set of views, they are loaded from a given piece of
		 * text. Uses <hogan.js>.
		 *
		 * Views on the cheap! Just use one mega template and divide it up into
		 * lots of baby templates :)
		 *
		 * @param {string} [src] text to parse for template contents initially
		 */
		Views: function ( src ) {
			this.views = {};

			this.setView = function ( name, content ) {
				this.views[ name ] = content;
			};

			this.renderView = function ( name, data ) {
				const view = this.views[ name ],
					template = Hogan.compile( view );

				return template.render( data );
			};

			this.loadFromSrc = function ( src ) {
				let viewRegex = /<!--\s(.*?)\s-->\r?\n([\s\S]*?)<!--\s\/(.*?)\s-->/g,
					match = viewRegex.exec( src );

				while ( match !== null ) {
					const key = match[ 1 ],
						content = match[ 2 ];

					this.setView( key, content );

					// Increment the match
					match = viewRegex.exec( src );
				}
			};

			this.loadFromSrc( src );
		},

		/**
		 * Represents a specific window into an AFCH.Views object
		 *
		 * @param {AFCH.Views} views location where the views are gleaned
		 * @param {jQuery} $element
		 */
		Viewer: function ( views, $element ) {
			this.views = views;
			this.$element = $element;

			this.$previousState = false;

			this.loadView = function ( view, data ) {
				const code = this.views.renderView( view, data );

				// Update the view cache
				this.$previousState = this.$element.clone( true );

				this.$element.html( code );
			};

			this.loadPrevious = function () {
				this.$element.replaceWith( this.$previousState );
				this.$element = this.$previousState;
			};
		}

	} );

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
