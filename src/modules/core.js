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
		 * Loads the subscript and dependencies
		 *
		 * @param {string} type Which type of script to load: 'redirects' or 'ffu' or 'submissions'
		 * @return {boolean}
		 */
		load: function ( type ) {
			if ( !AFCH.setup() ) {
				return false;
			}

			let promise = $.when();

			if ( AFCH.consts.beta ) {
				// Load minified css
				mw.loader.load( AFCH.consts.scriptpath + '?action=raw&ctype=text/css&title=MediaWiki:Gadget-afchelper.css', 'text/css' );
				promise = mw.loader.using( [
					'jquery.chosen',
					'jquery.spinner',
					'jquery.ui',

					'mediawiki.api',
					'mediawiki.util',
					'mediawiki.user'
				] );
			}

			// And finally load the subscript
			promise.then( () => {
				if ( type === 'submissions' ) {
					$.getScript( AFCH.consts.baseurl + '/submission-model.js' ).then( () => {
						$.getScript( AFCH.consts.baseurl + '/submissions.js' );
					} );
				} else {
					$.getScript( AFCH.consts.baseurl + '/' + type + '.js' );
				}
			} );

			return true;
		},

		/**
		 * Represents a page, mainly a wrapper for various actions
		 *
		 * @param {string} name
		 */
		Page: function ( name ) {
			const pg = this;

			this.title = new mw.Title( name );
			this.rawTitle = this.title.getPrefixedText();

			this.additionalData = {};
			this.hasAdditionalData = false;

			this.toString = function () {
				return this.rawTitle;
			};

			this.edit = function ( options ) {
				const deferred = $.Deferred();

				AFCH.actions.editPage( this.rawTitle, options )
					.done( ( data ) => {
						deferred.resolve( data );
					} );

				return deferred;
			};

			/**
			 * Makes an API request to get a variety of details about the current
			 * revision of the page, which it then sets.
			 *
			 * @param {boolean} usecache if true, will resolve immediately if function has
			 *                        run successfully before
			 * @return {jQuery.Deferred} resolves when data set successfully
			 */
			this._revisionApiRequest = function ( usecache ) {
				const deferred = $.Deferred();

				if ( usecache && pg.hasAdditionalData ) {
					return deferred.resolve();
				}

				AFCH.actions.getPageText( this.rawTitle, {
					hide: true,
					moreProps: 'timestamp|user|ids',
					moreParameters: { rvgeneratexml: true }
				} ).done( ( pagetext, data ) => {
					// Set internal data
					pg.pageText = pagetext;
					pg.additionalData.lastModified = new Date( data.timestamp );
					pg.additionalData.lastEditor = data.user;
					pg.additionalData.rawTemplateModel = data.parsetree;
					pg.additionalData.revId = data.revid;

					pg.hasAdditionalData = true;

					// Resolve; it's now safe to request this data
					deferred.resolve();
				} );

				return deferred;
			};

			/**
			 * Gets the page text
			 *
			 * @param {boolean} usecache use cache if possible
			 * @return {string}
			 */
			this.getText = function ( usecache ) {
				const deferred = $.Deferred();

				this._revisionApiRequest( usecache ).done( () => {
					deferred.resolve( pg.pageText );
				} );

				return deferred;
			};

			/**
			 * Gets templates on the page
			 *
			 * @return {Array} array of objects, each representing a template like
			 *                       {
			 *                           target: 'templateName',
			 *                           params: { 1: 'foo', test: 'go to the {{bar}}' }
			 *                       }
			 */
			this.getTemplates = function () {
				let $templateDom, templates = [],
					deferred = $.Deferred();

				this._revisionApiRequest( true ).done( () => {
					$templateDom = $( $.parseXML( pg.additionalData.rawTemplateModel ) ).find( 'root' );

					// We only want top level templates
					$templateDom.children( 'template' ).each( function () {
						const $el = $( this ),
							data = {
								target: $el.children( 'title' ).text(),
								params: {}
							};

						/**
						 * Essentially, this function takes a template value DOM object, $v,
						 * and removes all signs of XML-ishness. It does this by manipulating
						 * the raw text and doing a few choice string replacements to change
						 * the templates to use wikicode syntax instead. Rather than messing
						 * with recursion and all that mess, /g is our friend...which is pefectly
						 * satisfactory for our purposes.
						 *
						 * @param {jQuery} $v
						 * @return {string}
						 */
						function parseValue( $v ) {
							let text = AFCH.jQueryToHtml( $v );

							// Convert templates to look more template-y
							text = text.replace( /<template>/g, '{{' );
							text = text.replace( /<\/template>/g, '}}' );
							text = text.replace( /<part>/g, '|' );

							// Expand embedded tags (like <nowiki>)
							text = text.replace( new RegExp( '<ext><name>(.*?)<\\/name>(?:<attr>.*?<\\/attr>)*' +
								'<inner>(.*?)<\\/inner><close>(.*?)<\\/close><\\/ext>', 'g' ), '&lt;$1&gt;$2$3' );

							// Now convert it back to text, removing all the rest of the XML tags
							return $( text ).text();
						}

						$el.children( 'part' ).each( function () {
							const $part = $( this ),
								$name = $part.children( 'name' ),
								// Use the name if set, or fall back to index if implicitly numbered
								name = $.trim( $name.text() || $name.attr( 'index' ) ),
								value = $.trim( parseValue( $part.children( 'value' ) ) );

							data.params[ name ] = value;
						} );

						templates.push( data );
					} );

					deferred.resolve( templates );
				} );

				return deferred;
			};

			/**
			 * Gets the categories from the page
			 *
			 * @param {boolean} useApi If true, use the api to get categories, instead of parsing the page. This is
			 *                      necessary if you need info about transcluded categories.
			 * @param {boolean} includeCategoryLinks If true, will also include links to categories (e.g. [[:Category:Foo]]).
			 *                                    Note that if useApi is true, includeCategoryLinks must be false.
			 * @return {Array}
			 */
			this.getCategories = function ( useApi, includeCategoryLinks ) {
				const deferred = $.Deferred(),
					text = this.pageText;

				if ( useApi ) {
					AFCH.api.getCategories( this.title ).done( ( categories ) => {
						// The api returns mw.Title objects, so we convert them to simple
						// strings before resolving the deferred.
						deferred.resolve( categories ? $.map( categories, ( cat ) => cat.getPrefixedText() ) : [] );
					} );
					return deferred;
				}

				this._revisionApiRequest( true ).done( () => {
					let catRegex = new RegExp( '\\[\\[' + ( includeCategoryLinks ? ':?' : '' ) + 'Category:(.*?)\\s*\\]\\]', 'gi' ),
						match = catRegex.exec( text ),
						categories = [];

					while ( match ) {
						// Name of each category, with first letter capitalized
						categories.push( match[ 1 ].charAt( 0 ).toUpperCase() + match[ 1 ].slice( 1 ) );
						match = catRegex.exec( text );
					}

					deferred.resolve( categories );
				} );

				return deferred;
			};

			this.getShortDescription = function () {
				return AFCH.api.get( {
					action: 'query',
					prop: 'description',
					titles: this.rawTitle,
					formatversion: 2
				} ).then( ( json ) => json.query.pages[ 0 ].description || '' );
			};

			this.getLastModifiedDate = function () {
				const deferred = $.Deferred();

				this._revisionApiRequest( true ).done( () => {
					deferred.resolve( pg.additionalData.lastModified );
				} );

				return deferred;
			};

			this.getLastEditor = function () {
				const deferred = $.Deferred();

				this._revisionApiRequest( true ).done( () => {
					deferred.resolve( pg.additionalData.lastEditor );
				} );

				return deferred;
			};

			this.getCreator = function () {
				let request, deferred = $.Deferred();

				if ( this.additionalData.creator ) {
					deferred.resolve( this.additionalData.creator );
					return deferred;
				}

				request = {
					action: 'query',
					prop: 'revisions',
					rvprop: 'user',
					rvdir: 'newer',
					rvlimit: 1,
					indexpageids: true,
					titles: this.rawTitle
				};

				// FIXME: Handle failure more gracefully
				AFCH.api.get( request )
					.done( ( data ) => {
						let rev, id = data.query.pageids[ 0 ];
						if ( id && data.query.pages[ id ] ) {
							rev = data.query.pages[ id ].revisions[ 0 ];
							pg.additionalData.creator = rev.user;
							deferred.resolve( rev.user );
						} else {
							deferred.reject( data );
						}
					} );

				return deferred;
			};

			this.exists = function () {
				const deferred = $.Deferred();

				AFCH.api.get( {
					action: 'query',
					prop: 'info',
					titles: this.rawTitle
				} ).done( ( data ) => {
					// A nonexistent page will be indexed as '-1'
					if ( data.query.pages.hasOwnProperty( '-1' ) ) {
						deferred.resolve( false );
					} else {
						deferred.resolve( true );
					}
				} );

				return deferred;
			};

			/**
			 * Gets the associated talk page
			 *
			 * @return {AFCH.Page}
			 */
			this.getTalkPage = function () {
				let title, ns = this.title.getNamespaceId();

				// Odd-numbered namespaces are already talk namespaces
				if ( ns % 2 !== 0 ) {
					return this;
				}

				title = new mw.Title( this.title.getMainText(), ns + 1 );

				return new AFCH.Page( title.getPrefixedText() );
			};
		},

		/**
		 * Perform a specific action
		 */
		actions: {
			/**
			 * Gets the full wikicode content of a page
			 *
			 * @param {string} pagename The page to get the contents of, namespace included
			 * @param {Object} options Object with properties:
			 *                          hide: {bool} set to true to hide the API request in the status log
			 *                          moreProps: {string} additional properties to request, separated by `|`,
			 *                          moreParameters: {object} additioanl query parameters
			 * @return {jQuery.Deferred} Resolves with pagetext and full data available as parameters
			 */
			getPageText: function ( pagename, options ) {
				let status, request, rvprop = 'content',
					deferred = $.Deferred();

				if ( !options.hide ) {
					status = new AFCH.status.Element( 'Getting $1...',
						{ $1: AFCH.makeLinkElementToPage( pagename ) } );
				} else {
					status = AFCH.consts.nullstatus;
				}

				if ( options.moreProps ) {
					rvprop += '|' + options.moreProps;
				}

				request = {
					action: 'query',
					prop: 'revisions',
					rvprop: rvprop,
					format: 'json',
					indexpageids: true,
					titles: pagename
				};

				$.extend( request, options.moreParameters || {} );

				AFCH.api.get( request )
					.done( ( data ) => {
						let rev, id = data.query.pageids[ 0 ];
						if ( id && data.query.pages ) {
							// The page might not exist; resolve with an empty string
							if ( id === '-1' ) {
								deferred.resolve( '', {} );
								return;
							}

							rev = data.query.pages[ id ].revisions[ 0 ];
							deferred.resolve( rev[ '*' ], rev );
							status.update( 'Got $1' );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result
							status.update( 'Error getting $1: ' + JSON.stringify( data ) );
						}
					} )
					.fail( ( err ) => {
						deferred.reject( err );
						status.update( 'Error getting $1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
			 * Modifies a page's content
			 *
			 * @todo the property name "contents" is quite silly, because people used to the MediaWiki API are gonna write "text"
			 * @param {string} pagename The page to be modified, namespace included
			 * @param {Object} options Object with properties ('contents' is required, others are optional):
			 *                          contents: {string} the text to add to/replace the page,
			 *                          summary: {string} edit summary, will have the edit summary ad at the end,
			 *                          createonly: {boolean} set to true to only edit the page if it doesn't exist,
			 *                          mode: {string} 'appendtext' or 'prependtext'; default: (replace everything)
			 *                          hide: {boolean} Set to true to supress logging in statusWindow
			 *                          statusText: {string} message to show in status; default: "Editing"
			 *                          followRedirects: {boolean} true to follow redirects, false to ignore redirects
			 *                          watchlist: {string} 'nochange', 'preferences', 'unwatch', or 'watch'
			 *                          subscribe: {boolean} when appending a talk page section, whether or not to subscribe to it
			 * @return {jQuery.Deferred} Resolves if saved with all data
			 */
			editPage: function ( pagename, options ) {
				let status, request, deferred = $.Deferred();

				if ( !options ) {
					options = {};
				}

				// Default to false
				if ( !options.followRedirects ) {
					options.followRedirects = false;
				}

				if ( !options.hide ) {
					status = new AFCH.status.Element( ( options.statusText || 'Editing' ) + ' $1...',
						{ $1: AFCH.makeLinkElementToPage( pagename ) } );
				} else {
					status = AFCH.consts.nullstatus;
				}

				if ( !options.subscribe ) {
					request = {
						action: 'edit',
						title: pagename,
						text: options.contents,
						summary: options.summary,
						redirect: options.followRedirects,
						tags: AFCH.consts.tag
					};
				} else {
					// Because it is easier to do subscriptions with it, use the discussiontoolsedit API instead of the edit API
					request = {
						action: 'discussiontoolsedit',
						paction: 'addtopic',
						page: pagename,
						sectiontitle: '',
						wikitext: options.contents.trim(),
						summary: options.summary,
						autosubscribe: 'yes',
						tags: AFCH.consts.tag
					};
				}

				if ( pagename.indexOf( 'Draft:' ) === 0 ) {
					request.nocreate = 'true';
				}

				if ( options.minor ) {
					request.minor = 'true';
				}

				if ( [ 'nochange', 'preferences', 'unwatch', 'watch' ].includes( options.watchlist ) ) {
					request.watchlist = options.watchlist;
				} else if ( AFCH.prefs.noWatch ) {
					request.watchlist = 'nochange';
				}

				// Depending on mode, set appendtext=text or prependtext=text,
				// which overrides the default text option
				if ( !options.subscribe && options.mode ) {
					request[ options.mode ] = options.contents;
				}

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( 'Edit to "' + pagename + '"', request );
					deferred.resolve();
					return deferred;
				}

				AFCH.api.postWithEditToken( request )
					.done( ( data ) => {
						let $diffLink;
						const api = options.subscribe ? 'discussiontoolsedit' : 'edit';
						// The success string is capitalized by one API and not the other
						const success = options.subscribe ? 'success' : 'Success';

						if ( data && data[ api ] && data[ api ].result && data[ api ].result === success ) {
							deferred.resolve( data );

							if ( data[ api ].hasOwnProperty( 'nochange' ) ) {
								status.update( 'No changes made to $1' );
								return;
							}

							// Create a link to the diff of the edit
							$diffLink = AFCH.makeLinkElementToPage(
								'Special:Diff/' + data[ api ].newrevid, '(diff)'
							).addClass( 'text-smaller' );

							status.update( 'Saved $1 ' + AFCH.jQueryToHtml( $diffLink ) );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result??
							status.update( 'Error while saving $1: ' + JSON.stringify( data ) );
						}
					} )
					.fail( ( err ) => {
						deferred.reject( err );
						status.update( 'Error while saving $1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
			 * Moves a page
			 *
			 * @param {string} oldTitle Page to move
			 * @param {string} newTitle Move target
			 * @param {string} reason Reason for moving; shown in move log
			 * @param {Object} additionalParameters https://www.mediawiki.org/wiki/API:Move#Parameters
			 * @param {boolean} hide Don't show the move in the status display
			 * @return {jQuery.Deferred} Resolves with success/failure
			 */
			movePage: function ( oldTitle, newTitle, reason, additionalParameters, hide ) {
				let status, request, deferred = $.Deferred();

				if ( !hide ) {
					status = new AFCH.status.Element( 'Moving $1 to $2...', {
						$1: AFCH.makeLinkElementToPage( oldTitle ),
						$2: AFCH.makeLinkElementToPage( newTitle )
					} );
				} else {
					status = AFCH.consts.nullstatus;
				}

				request = $.extend( {
					action: 'move',
					from: oldTitle,
					to: newTitle,
					reason: reason,
					tags: AFCH.consts.tag
				}, additionalParameters );

				if ( AFCH.prefs.noWatch ) {
					request.watchlist = 'nochange';
				}

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve( { to: newTitle } );
					return deferred;
				}

				AFCH.api.postWithEditToken( request ) // Move token === edit token
					.done( ( data ) => {
						if ( data && data.move ) {
							status.update( 'Moved $1 to $2' );
							deferred.resolve( data.move );
						} else {
							// FIXME: get detailed error info from API result??
							status.update( 'Error moving $1 to $2: ' + JSON.stringify( data.error ) );
							deferred.reject( data.error );
						}
					} )
					.fail( ( err ) => {
						status.update( 'Error moving $1 to $2: ' + JSON.stringify( err ) );
						deferred.reject( err );
					} );

				return deferred;
			},

			/**
			 * Notifies a user. Follows redirects and appends a message
			 * to the bottom of the user's talk page.
			 *
			 * @param {string} user
			 * @param {Object} options object with properties
			 *                   - message: {string}
			 *                   - summary: {string} edit summary
			 *                   - hide: {bool}, default false
			 * @return {jQuery.Deferred} Resolves with success/failure
			 */
			notifyUser: function ( user, options ) {
				const deferred = $.Deferred(),
					userTalkPage = new AFCH.Page( new mw.Title( user, 3 ).getPrefixedText() ); // 3 = user talk namespace

				userTalkPage.exists().done( ( exists ) => {
					userTalkPage.edit( {
						contents: ( exists ? '' : '{{Talk header}}' ) + '\n\n' + options.message,
						summary: options.summary || 'Notifying user',
						mode: 'appendtext',
						statusText: 'Notifying',
						hide: options.hide,
						followRedirects: true,
						subscribe: AFCH.prefs.autoSubscribe
					} )
						.done( () => {
							deferred.resolve();
						} )
						.fail( () => {
							deferred.reject();
						} );
				} );

				return deferred;
			},

			/**
			 * Logs a CSD nomination
			 *
			 * @param {Object} options
			 *                  - title {string}
			 *                  - reason {string}
			 *                  - usersNotified {array} optional
			 * @return {jQuery.Deferred|void} resolves false if the page did not exist, otherwise resolves/rejects with data from the edit
			 */
			logCSD: function ( options ) {
				const deferred = $.Deferred(),
					logPage = new AFCH.Page( 'User:' + mw.config.get( 'wgUserName' ) + '/' +
						( window.Twinkle && window.Twinkle.getPref( 'speedyLogPageName' ) || 'CSD log' ) );

				// Abort if user disabled in preferences
				if ( !AFCH.prefs.logCsd ) {
					return;
				}

				logPage.getText().done( ( logText ) => {

					// Don't edit if the page has doesn't exist or has no text
					if ( !logText ) {
						deferred.resolve( false );
						return;
					}

					let appendText = AFCH.actions.addLogHeaderIfNeeded( logText );

					appendText += '\n# [[:' + options.title + ']]: ' + options.reason;

					if ( options.usersNotified && options.usersNotified.length ) {
						appendText += '; notified {{user|1=' + options.usersNotified.shift() + '}}';

						$.each( options.usersNotified, ( _, user ) => {
							appendText += ', {{user|1=' + user + '}}';
						} );
					}

					appendText += ' ~~~~~\n';

					logPage.edit( {
						contents: appendText,
						mode: 'appendtext',
						summary: 'Logging speedy deletion nomination of [[' + options.title + ']]',
						statusText: 'Logging speedy deletion nomination to'
					} ).done( ( data ) => {
						deferred.resolve( data );
					} ).fail( ( data ) => {
						deferred.reject( data );
					} );
				} );

				return deferred;
			},

			logAfc: function ( options ) {
				const deferred = $.Deferred(),
					logPage = new AFCH.Page( 'User:' + mw.config.get( 'wgUserName' ) + '/AfC log' );

				// Abort if user disabled in preferences
				if ( !AFCH.prefs.logAfc ) {
					return;
				}

				logPage.getText().done( ( logText ) => {
					// Build log message
					const header = AFCH.actions.addLogHeaderIfNeeded( logText );
					const action = '\n# ' + options.actionType.charAt( 0 ).toUpperCase() + options.actionType.slice( 1 ) +
										( options.actionType === 'decline' ? '' : 'e' ) + 'd';
					const title = ' [[:' + options.title + ']]';

					let declineReason = '';
					if ( options.actionType === 'decline' ) {
						// Custom is stored as 'reason' (because of template weirdness?), convert if necessary
						options.declineReason = ( options.declineReason === 'reason' ) ? 'custom' : options.declineReason;
						options.declineReason2 = ( options.declineReason2 === 'reason' ) ? 'custom' : options.declineReason2;

						declineReason = ' (' + options.declineReason + ( options.declineReason2 ? ' & ' + options.declineReason2 : '' ) + ')';
					}

					const byUser = ' by [[User:' + options.submitter + '|]]';
					const sig = ' ~~~~~\n';

					// Make log edit
					logPage.edit( {
						contents: header + action + title + declineReason + byUser + sig,
						mode: 'appendtext',
						summary: 'Logging ' + options.actionType + ' of [[' + options.title + ']]',
						statusText: 'Logging ' + options.actionType + ' to'
					} ).done( ( data ) => {
						deferred.resolve( data );
					} ).fail( ( data ) => {
						deferred.reject( data );
					} );
				} );

				return deferred;
			},

			/**
			 * Takes text of the log page; returns a string with the header for the current month
			 * if that header doesn't already exist
			 *
			 * @param {string} logText Text of user's AfC log
			 * @return {string} headerText
			 */
			addLogHeaderIfNeeded: function ( logText ) {
				let date = new Date(),
					monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
					headerRe = new RegExp( '^==+\\s*' + monthNames[ date.getUTCMonth() ] + '\\s+' + date.getUTCFullYear() + '\\s*==+', 'm' ),
					headerText = '';

				if ( !headerRe.test( logText ) ) {
					headerText += '\n\n=== ' + monthNames[ date.getUTCMonth() ] + ' ' + date.getUTCFullYear() + ' ===';
				}

				return headerText;
			},

			/**
			 * If user is allowed, marks a given recentchanges ID as patrolled
			 *
			 * @param {string|number} rcid rcid to mark as patrolled
			 * @param {string} title Prettier title to display. If not specified, falls back to just
			 *                       displaying the rcid instead.
			 * @return {jQuery.Deferred}
			 */
			patrolRcid: function ( rcid, title ) {
				let request, deferred = $.Deferred(),
					status = new AFCH.status.Element( 'Patrolling $1...',
						{ $1: AFCH.makeLinkElementToPage( title ) || 'page with id #' + rcid } );

				request = {
					action: 'patrol',
					rcid: rcid
				};

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve();
					return deferred;
				}

				AFCH.api.postWithToken( 'patrol', request ).done( ( data ) => {
					if ( data.patrol && data.patrol.rcid ) {
						status.update( 'Patrolled $1' );
						deferred.resolve( data );
					} else {
						status.update( 'Failed to patrol $1: ' + JSON.stringify( data.patrol ) );
						deferred.reject( data );
					}
				} ).fail( ( data ) => {
					status.update( 'Failed to patrol $1: ' + JSON.stringify( data ) );
					deferred.reject( data );
				} );

				return deferred;
			}
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
				logAfc: false,
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
						url: AFCH.consts.baseurl + '/tpl-preferences.js',
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
