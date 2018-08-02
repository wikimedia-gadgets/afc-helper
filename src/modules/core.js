//<nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {

		/**
		 * Log anything to the console
		 * @param {anything} thing(s)
		 */
		log: function () {
			var args = Array.prototype.slice.call( arguments );

			if ( AFCH.consts.beta && console && console.log ) {
				args.unshift( 'AFCH:' );
				console.log.apply( console, args );
			}
		},

		/**
		 * @internal Functions called when AFCH.destroy() is run
		 * @type {Array}
		 */
		_destroyFunctions: [],

		/**
		 * Add a function to run when AFCH.destroy() is run
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
			$.each( AFCH._destroyFunctions, function ( _, fn ) {
				fn();
			} );

			window.AFCH = false;
		},

		/**
		 * Prepares the AFCH gadget by setting constants and checking environment
		 * @return {bool} Whether or not all setup functions executed successfully
		 */
		setup: function () {
			// Check requirements
			if ( 'ajax' in $.support && !$.support.ajax ) {
				AFCH.error = 'AFCH requires AJAX';
				return false;
			}

			if ( AFCH.consts.baseurl.indexOf( 'MediaWiki:' + 'Gadget-afch.js' ) === -1 ) {
				AFCH.consts.beta = true;
			}

			AFCH.api = new mw.Api();

			// Set up the preferences interface
			AFCH.preferences = new AFCH.Preferences();
			AFCH.prefs = AFCH.preferences.prefStore;

			// Add more constants -- don't overwrite those already set, though
			AFCH.consts = $.extend( {}, {
				// If true, the script will NOT modify actual wiki content and
				// will instead mock all such API requests (success assumed)
				mockItUp: false,
				// Full page name, "Wikipedia talk:Articles for creation/sandbox"
				pagename: mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),
				// Link to the current page, "/wiki/Wikipedia talk:Articles for creation/sandbox"
				pagelink: mw.util.getUrl(),
				// Used when status is disabled
				nullstatus: { update: function () { return; } },
				// Current user
				user: mw.user.getName(),
				// Edit summary ad
				summaryAd: ' ([[WP:AFCH|AFCH]] ' + AFCH.consts.version + ')',
				// Require users to be on whitelist to use the script
				whitelistRequired: true,
				// Name of the whitelist page for reviewers
				whitelistTitle: 'Wikipedia:WikiProject Articles for creation/Participants'
			}, AFCH.consts );

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
			var user = AFCH.consts.user,
				whitelist = new AFCH.Page( AFCH.consts.whitelistTitle );
			whitelist.getText().done( function ( text ) {

				// sanitizedUser is user, but escaped for use in the regex.
				// Otherwise a user named ... would always be able to use
				// the script, so long as there was a user whose name was
				// three characters long on the list!
				var $howToDisable,
					sanitizedUser = user.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&' ),
					userAllowed = ( new RegExp( '\\|\\s*' + sanitizedUser + '\\s*}' ) ).test( text );

				if ( !userAllowed ) {

					// If we can detect that the gadget is currently enabled, offer a one-click "disable" link
					if ( mw.user.options.get( 'gadget-afchelper' ) === '1' ) {
						$howToDisable = $( '<span>' )
							.append( 'If you wish to disable the helper script, ' )
							.append( $( '<a>' )
								.text( 'click here' )
								.click( function () {
									// Submit the API request to disable the gadget.
									// Note: We don't use `AFCH.api` here, because AFCH has already been
									// destroyed due to the user not being on the whitelist!
									( new mw.Api() ).postWithToken( 'options', {
										action: 'options',
										change: 'gadget-afchelper=0'
									} ).done( function ( data ) {
										mw.notify( 'AFCH has been disabled successfully. If you wish to re-enable it in the ' +
											'future, you can do so via your Preferences by checking "Yet Another AFC Helper Script".' );
									} );
								} )
							)
							.append( '. ' );

					// Otherwise, AFCH is probably installed via common.js/skin.js -- offer links for easy access.
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
		 * @param {string} type Which type of script to load:
		 *                      'redirects' or 'ffu' or 'submissions'
		 */
		load: function ( type ) {
			if ( !AFCH.setup() ) {
				return false;
			}

			if ( AFCH.consts.beta ) {
				// Load minified css
				mw.loader.load( AFCH.consts.scriptpath + '?action=raw&ctype=text/css&title=MediaWiki:Gadget-afch.css', 'text/css' );
				// Load dependencies
				mw.loader.load( [
					// jquery resources
					'jquery.chosen',
					'jquery.spinner',
					'jquery.ui.dialog',

					// mediawiki.api
					'mediawiki.api',
					'mediawiki.api.category',
					'mediawiki.api.titleblacklist',

					// mediawiki plugins
					'mediawiki.feedback'
				] );
			}

			// And finally load the subscript
			$.getScript( AFCH.consts.baseurl + '/' + type + '.js' );

			return true;
		},

		/**
		 * Appends a feedback link to the given element
		 * @param {string|jQuery} $element The jQuery element or selector to which the link should be appended
		 * @param {string} type (optional) The part of AFCH that feedback is being given for, e.g. "files for upload"
		 * @param {string} linkText (optional) Text to display in the link; by default "Give feedback!"
		 */
		initFeedback: function ( $element, type, linkText ) {
			var feedback = new mw.Feedback( {
				title: new mw.Title( 'Wikipedia talk:WikiProject Articles for creation/Helper script' ),
				bugsLink: 'https://en.wikipedia.org/w/index.php?title=Wikipedia_talk:WikiProject_Articles_for_creation/Helper_script&action=edit&section=new',
				bugsListLink: 'https://en.wikipedia.org/w/index.php?title=Wikipedia_talk:WikiProject_Articles_for_creation/Helper_script'
			} );
			$( '<span>' )
				.text( linkText || 'Give feedback!' )
				.addClass( 'feedback-link link' )
				.click( function () {
					feedback.launch( {
						subject: '[' + AFCH.consts.version + '] ' + ( type ? 'Feedback about ' + type : 'AFCH feedback' )
					} );
				} )
				.appendTo( $element );
		},

		/**
		 * Represents a page, mainly a wrapper for various actions
		 */
		Page: function ( name ) {
			var pg = this;

			this.title = new mw.Title( name );
			this.rawTitle = this.title.getPrefixedText();

			this.additionalData = {};
			this.hasAdditionalData = false;

			this.toString = function () {
				return this.rawTitle;
			};

			this.edit = function ( options ) {
				var deferred = $.Deferred();

				AFCH.actions.editPage( this.rawTitle, options )
					.done( function ( data ) {
						deferred.resolve( data );
					} );

				return deferred;
			};

			/**
			 * Makes an API request to get a variety of details about the current
			 * revision of the page, which it then sets.
			 * @param {bool} usecache if true, will resolve immediately if function has
			 *                        run successfully before
			 * @return {$.Deferred} resolves when data set successfully
			 */
			this._revisionApiRequest = function ( usecache ) {
				var deferred = $.Deferred();

				if ( usecache && pg.hasAdditionalData ) {
					return deferred.resolve();
				}

				AFCH.actions.getPageText( this.rawTitle, {
					hide: true,
					moreProps: 'timestamp|user|ids',
					moreParameters: { rvgeneratexml: true }
				} ).done( function ( pagetext, data ) {
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
			 * @param {bool} usecache use cache if possible
			 * @return {string}
			 */
			this.getText = function ( usecache ) {
				var deferred = $.Deferred();

				this._revisionApiRequest( usecache ).done( function () {
					deferred.resolve( pg.pageText );
				} );

				return deferred;
			};

			/**
			 * Gets templates on the page
			 * @return {array} array of objects, each representing a template like
			 *                       {
			 *                           target: 'templateName',
			 *                           params: { 1: 'foo', test: 'go to the {{bar}}' }
			 *                       }
			 */
			this.getTemplates = function () {
				var $templateDom, templates = [],
					deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					$templateDom = $( $.parseXML( pg.additionalData.rawTemplateModel ) ).find( 'root' );

					// We only want top level templates
					$templateDom.children( 'template' ).each( function () {
						var $el = $( this ),
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
						 */
						function parseValue( $v ) {
							var text = AFCH.jQueryToHtml( $v );

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
							var $part = $( this ),
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
			 * @param {bool} useApi If true, use the api to get categories, instead of parsing the page. This is
			 *                      necessary if you need info about transcluded categories.
			 * @param {bool} includeCategoryLinks If true, will also include links to categories (e.g. [[:Category:Foo]]).
			 *                                    Note that if useApi is true, includeCategoryLinks must be false.
			 * @return {array}
			 */
			this.getCategories = function ( useApi, includeCategoryLinks ) {
				var deferred = $.Deferred(),
					text = this.pageText;

				if ( useApi ) {
					AFCH.api.getCategories( this.title ).done( function ( categories ) {
						// The api returns mw.Title objects, so we convert them to simple
						// strings before resolving the deferred.
						deferred.resolve( categories ? $.map( categories, function ( cat ) {
							return cat.getPrefixedText();
						} ) : [] );
					} );
					return deferred;
				}

				this._revisionApiRequest( true ).done( function () {
					var catRegex = new RegExp( '\\[\\[' + ( includeCategoryLinks ? ':?' : '' ) + 'Category:(.*?)\\s*\\]\\]', 'gi' ),
						match = catRegex.exec( text ),
						categories = [];

					while ( match ) {
						// Name of each category, with first letter capitalized
						categories.push( match[ 1 ].charAt( 0 ).toUpperCase() + match[ 1 ].substring( 1 ) );
						match = catRegex.exec( text );
					}

					deferred.resolve( categories );
				} );

				return deferred;
			};

			this.getLastModifiedDate = function () {
				var deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					deferred.resolve( pg.additionalData.lastModified );
				} );

				return deferred;
			};

			this.getLastEditor = function () {
				var deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					deferred.resolve( pg.additionalData.lastEditor );
				} );

				return deferred;
			};

			this.getCreator = function () {
				var request, deferred = $.Deferred();

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
					.done( function ( data ) {
						var rev, id = data.query.pageids[ 0 ];
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
				var deferred = $.Deferred();

				AFCH.api.get( {
					action: 'query',
					prop: 'info',
					titles: this.rawTitle
				} ).done( function ( data ) {
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
			 * @return {AFCH.Page}
			 */
			this.getTalkPage = function ( textOnly ) {
				var title, ns = this.title.getNamespaceId();

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
			 * @param {string} pagename The page to get the contents of, namespace included
			 * @param {object} options Object with properties:
			 *                          hide: {bool} set to true to hide the API request in the status log
			 *                          moreProps: {string} additional properties to request, separated by `|`,
			 *                          moreParameters: {object} additioanl query parameters
			 * @return {$.Deferred} Resolves with pagetext and full data available as parameters
			 */
			getPageText: function ( pagename, options ) {
				var status, request, rvprop = 'content',
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
					.done( function ( data ) {
						var rev, id = data.query.pageids[ 0 ];
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
					.fail( function ( err ) {
						deferred.reject( err );
						status.update( 'Error getting $1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
			 * Modifies a page's content
			 * @param {string} pagename The page to be modified, namespace included
			 * @param {object} options Object with properties:
			 *                          contents: {string} the text to add to/replace the page,
			 *                          summary: {string} edit summary, will have the edit summary ad at the end,
			 *                          createonly: {bool} set to true to only edit the page if it doesn't exist,
			 *                          mode: {string} 'appendtext' or 'prependtext'; default: (replace everything)
			 *                          hide: {bool} Set to true to supress logging in statusWindow
			 *                          statusText: {string} message to show in status; default: "Editing"
			 * @return {jQuery.Deferred} Resolves if saved with all data
			 */
			editPage: function ( pagename, options ) {
				var status, request, deferred = $.Deferred();

				if ( !options ) {
					options = {};
				}

				if ( !options.hide ) {
					status = new AFCH.status.Element( ( options.statusText || 'Editing' ) + ' $1...',
						{ $1: AFCH.makeLinkElementToPage( pagename ) } );
				} else {
					status = AFCH.consts.nullstatus;
				}

				request = {
					action: 'edit',
					text: options.contents,
					title: pagename,
					summary: options.summary + AFCH.consts.summaryAd
				};

				// Depending on mode, set appendtext=text or prependtext=text,
				// which overrides the default text option
				if ( options.mode ) {
					request[ options.mode ] = options.contents;
				}

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve();
					return deferred;
				}

				AFCH.api.postWithToken( 'edit', request )
					.done( function ( data ) {
						var $diffLink;

						if ( data && data.edit && data.edit.result && data.edit.result === 'Success' ) {
							deferred.resolve( data );

							if ( data.edit.hasOwnProperty( 'nochange' ) ) {
								status.update( 'No changes made to $1' );
								return;
							}

							// Create a link to the diff of the edit
							$diffLink = AFCH.makeLinkElementToPage(
								'Special:Diff/' + data.edit.oldrevid + '/' + data.edit.newrevid, '(diff)'
							).addClass( 'text-smaller' );

							status.update( 'Saved $1 ' + AFCH.jQueryToHtml( $diffLink ) );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result??
							status.update( 'Error while saving $1: ' + JSON.stringify( data ) );
						}
					} )
					.fail( function ( err ) {
						deferred.reject( err );
						status.update( 'Error while saving $1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
			 * Deletes a page
			 * @param  {string} pagename Page to delete
			 * @param  {string} reason   Reason for deletion; shown in deletion log
			 * @return {$.Deferred} Resolves with success/failure
			 */
			deletePage: function ( pagename, reason ) {
				// FIXME: implement
				return false;
			},

			/**
			 * Moves a page
			 * @param {string} oldTitle Page to move
			 * @param {string} newTitle Move target
			 * @param {string} reason Reason for moving; shown in move log
			 * @param {object} additionalParameters https://www.mediawiki.org/wiki/API:Move#Parameters
			 * @param {bool} hide Don't show the move in the status display
			 * @return {$.Deferred} Resolves with success/failure
			 */
			movePage: function ( oldTitle, newTitle, reason, additionalParameters, hide ) {
				var status, request, deferred = $.Deferred();

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
					reason: reason + AFCH.consts.summaryAd
				}, additionalParameters );

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve( { to: newTitle } );
					return deferred;
				}

				AFCH.api.postWithToken( 'edit', request ) // Move token === edit token
					.done( function ( data ) {
						if ( data && data.move ) {
							status.update( 'Moved $1 to $2' );
							deferred.resolve( data.move );
						} else {
							// FIXME: get detailed error info from API result??
							status.update( 'Error moving $1 to $2: ' + JSON.stringify( data.error ) );
							deferred.reject( data.error );
						}
					} )
					.fail( function ( err ) {
						status.update( 'Error moving $1 to $2: ' + JSON.stringify( err ) );
						deferred.reject( err );
					} );

				return deferred;
			},

			/**
			 * Notifies a user. Follows redirects and appends a message
			 * to the bottom of the user's talk page.
			 * @param  {string} user
			 * @param  {object} data object with properties
			 *                   - message: {string}
			 *                   - summary: {string}
			 *                   - hide: {bool}, default false
			 * @return {$.Deferred} Resolves with success/failure
			 */
			notifyUser: function ( user, options ) {
				var deferred = $.Deferred(),
					userTalkPage = new AFCH.Page( new mw.Title( user, 3 ).getPrefixedText() ); // 3 = user talk namespace

				userTalkPage.exists().done( function ( exists ) {
					userTalkPage.edit( {
						contents: ( exists ? '' : '{{Talk header}}' ) + '\n\n' + options.message,
						summary: options.summary || 'Notifying user',
						mode: 'appendtext',
						statusText: 'Notifying',
						hide: options.hide
					} )
						.done( function () {
							deferred.resolve();
						} )
						.fail( function () {
							deferred.reject();
						} );
				} );

				return deferred;
			},

			/**
			 * Logs a CSD nomination
			 * @param {object} options
			 *                  - title {string}
			 *                  - reason {string}
			 *                  - usersNotified {array} optional
			 * @return {$.Deferred} resolves false if the page did not exist, otherwise
			 *                      resolves/rejects with data from the edit
			 */
			logCSD: function ( options ) {
				var deferred = $.Deferred(),
					logPage = new AFCH.Page( 'User:' + mw.config.get( 'wgUserName' ) + '/' +
						( window.Twinkle && window.Twinkle.getPref( 'speedyLogPageName' ) || 'CSD log' ) );

				// Abort if user disabled in preferences
				if ( !AFCH.prefs.logCsd ) {
					return;
				}

				logPage.getText().done( function ( logText ) {
					var status,
						date = new Date(),
						headerRe = new RegExp( '^==+\\s*' + date.getUTCMonthName() + '\\s+' + date.getUTCFullYear() + '\\s*==+', 'm' ),
						appendText = '';

					// Don't edit if the page has doesn't exist or has no text
					if ( !logText ) {
						deferred.resolve( false );
						return;
					}

					// Add header for new month if necessary
					if ( !headerRe.test( logText ) ) {
						appendText += '\n\n=== ' + date.getUTCMonthName() + ' ' + date.getUTCFullYear() + ' ===';
					}

					appendText += '\n# [[:' + options.title + ']]: ' + options.reason;

					if ( options.usersNotified && options.usersNotified.length ) {
						appendText += '; notified {{user|1=' + options.usersNotified.shift() + '}}';

						$.each( options.usersNotified, function ( _, user ) {
							appendText += ', {{user|1=' + user + '}}';
						} );
					}

					appendText += ' ~~' + '~~' + '~\n';

					logPage.edit( {
						contents: appendText,
						mode: 'appendtext',
						summary: 'Logging speedy deletion nomination of [[' + options.title + ']]',
						statusText: 'Logging speedy deletion nomination to'
					} ).done( function ( data ) {
						deferred.resolve( data );
					} ).fail( function ( data ) {
						deferred.reject( data );
					} );
				} );

				return deferred;
			},

			/**
			 * If user is allowed, marks a given recentchanges ID as patrolled
			 * @param {string|number} rcid rcid to mark as patrolled
			 * @param {string} title Prettier title to display. If not specified, falls back to just
			 *                       displaying the rcid instead.
			 * @return {$.Deferred}
			 */
			patrolRcid: function ( rcid, title ) {
				var request, deferred = $.Deferred(),
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

				AFCH.api.postWithToken( 'patrol', request ).done( function ( data ) {
					if ( data.patrol && data.patrol.rcid ) {
						status.update( 'Patrolled $1' );
						deferred.resolve( data );
					} else {
						status.update( 'Failed to patrol $1: ' + JSON.stringify( data.patrol ) );
						deferred.reject( data );
					}
				} ).fail( function ( data ) {
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
			container: false,

			/**
			 * Creates the status container
			 * @param  {selector} location String/jQuery selector for where the
			 *                             status container should be prepended
			 */
			init: function ( location ) {
				AFCH.status.container = $( '<div>' )
					.attr( 'id', 'afchStatus' )
					.addClass( 'afchStatus' )
					.prependTo( location || '#mw-content-text' );
			},

			/**
			 * Represents an element in the status container
			 * @param  {string} initialText Initial text of the element
			 * @param {object} substitutions key-value pairs of strings that should be replaced by something
			 *                               else. For example, { '$2': mw.user.getUser() }. If not redefined, $1
			 *                               will be equal to the current page name.
			 */
			Element: function ( initialText, substitutions ) {
				/**
				 * Replace the status element with new html content
				 * @param  {jQuery|string} html Content of the element
				 *                              Can use $1 to represent the page name
				 */
				this.update = function ( html ) {
					// Convert to HTML first if necessary
					if ( html.jquery ) {
						html = AFCH.jQueryToHtml( html );
					}

					// First run the substutions
					$.each( this.substitutions, function ( key, value ) {
						// If we are passed a jQuery object, convert it to regular HTML first
						if ( value.jquery ) {
							value = AFCH.jQueryToHtml( value );
						}

						html = html.replace( key, value );
					} );
					// Then update the element
					this.element.html( html );
				};

				/**
				 * Remove the element from the status container
				 */
				this.remove = function () {
					this.update( '' );
				};

				// Sanity check, there better be a status container
				if ( !AFCH.status.container ) {
					AFCH.status.init();
				}

				if ( !substitutions ) {
					substitutions = { $1: AFCH.consts.pagelink };
				} else {
					substitutions = $.extend( {}, { $1: AFCH.consts.pagelink }, substitutions );
				}

				this.substitutions = substitutions;

				this.element = $( '<li>' )
					.appendTo( AFCH.status.container );

				this.update( initialText );
			}
		},

		/**
		 * A simple framework for getting/setting interface messages.
		 * Not every message necessarily needs to go through here. But
		 * it's nice to separate long messages from the code itself.
		 * @type {Object}
		 */
		msg: {
			/**
			 * AFCH messages loaded by default for all subscripts.
			 * @type {Object}
			 */
			store: {},

			/**
			 * Retrieve the text of a message, or a placeholder if the
			 * message is not set
			 * @param {string} key Message key
			 * @param {object} substitutions replacements to make
			 * @return {string} Message value
			 */
			get: function ( key, substitutions ) {
				var text = AFCH.msg.store[ key ] || '<' + key + '>';

				// Perform substitutions if necessary
				if ( substitutions ) {
					$.each( substitutions, function ( original, replacement ) {
						text = text.replace(
							// Escape the original substitution key, then make it a global regex
							new RegExp( original.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' ), 'g' ),
							replacement
						);
					} );
				}

				return text;
			},

			/**
			 * Set a new message or messages
			 * @param {string|object} key
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
			 * @param {string} key
			 * @param {mixed} value
			 * @return {$.Deferred} success
			 */
			set: function ( key, value ) {
				var deferred = $.Deferred(),
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

				AFCH.api.postWithToken( 'options', {
					action: 'options',
					optionname: fullKey,
					optionvalue: fullValue
				} ).done( function ( data ) {
					deferred.resolve( data );
				} );

				return deferred;
			},

			/**
			 * Gets a value from the data store
			 * @param {string} key
			 * @param {mixed} fallback fallback if option not present
			 * @return {mixed} value
			 */
			get: function ( key, fallback ) {
				var value,
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
		 * @type {object}
		 */
		Preferences: function () {
			var prefs = this;

			/**
			 * Default values for user preferences; details for each preference can be
			 * found inline in `templates/tpl-preferences.html`.
			 * @type {object}
			 */
			this.prefDefaults = {
				autoOpen: false,
				logCsd: true,
				launchLinkPosition: 'p-cactions'
			};

			/**
			 * Current user's preferences
			 * @type {object}
			 */
			this.prefStore = $.extend( {}, this.prefDefaults, AFCH.userData.get( 'preferences', {} ) );

			/**
			 * Initializes the preferences modification dialog
			 */
			this.initDialog = function () {
				var $spinner = $.createSpinner( {
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
					} ).done( function ( data ) {
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
						version: AFCH.consts.version,
						versionName: AFCH.consts.versionName,
						userAgent: window.navigator.userAgent
					} ) )
				);

				// Manually handle selecting the desired value in <select> menus
				this.$dialog.find( 'select' ).each( function () {
					var $select = $( this ),
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
				AFCH.userData.set( 'preferences', this.prefStore ).done( function () {
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
					.click( function () {
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
				var view = this.views[ name ],
					template = Hogan.compile( view );

				return template.render( data );
			};

			this.loadFromSrc = function ( src ) {
				var viewRegex = /<!--\s(.*?)\s-->\n([\s\S]*?)<!--\s\/(.*?)\s-->/g,
					match = viewRegex.exec( src );

				while ( match !== null ) {
					var key = match[ 1 ],
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

			this.previousState = false;

			this.loadView = function ( view, data ) {
				var code = this.views.renderView( view, data );

				// Update the view cache
				this.previousState = this.$element.clone( true );

				this.$element.html( code );
			};

			this.loadPrevious = function () {
				this.$element.replaceWith( this.previousState );
				this.$element = this.previousState;
			};
		},

		/**
		 * Removes a key from a given object and returns the value of the key
		 * @param {string} key
		 * @return {mixed}
		 */
		getAndDelete: function ( object, key ) {
			var v = object[ key ];
			delete object[ key ];
			return v;
		},

		/**
		 * Removes all occurences of a value from an array
		 * @param {array} array
		 * @param {mixed} value
		 */
		removeFromArray: function ( array, value ) {
			var index = $.inArray( value, array );
			while ( index !== -1 ) {
				array.splice( index, 1 );
				index = $.inArray( value, array );
			}
		},

		/**
		 * Gets the values of all elements matched by a selector, including
		 * converting checkboxes to bools, providing textual values of select
		 * elements, ignoring placeholder elements, and more.
		 *
		 * For a radio button group, pass in the container element, which must
		 * be a fieldset with the appropriate "name" attribute. Its id will
		 * be used as the key in the data object.
		 *
		 * @param {jQuery} $selector elements to get values from
		 * @return {object} object of values, with the ids as keys
		 */
		getFormValues: function ( $selector ) {
			var data = {};

			$selector.each( function ( _, element ) {
				var value, allTexts,
					$element = $( element );

				if ( element.type === 'checkbox' ) {
					value = element.checked;
				} else if ( element.type === 'fieldset' ) {
					value = $element.find( ':checked' ).val();
				} else {
					value = $element.val();

					// Ignore placeholder text
					if ( value === $element.attr( 'placeholder' ) ) {
						value = '';
					}

					// For <select multiple> with nothing selected, jQuery returns null...
					// convert that to an empty array so that $.each() won't explode later
					if ( value === null ) {
						value = [];
					}

					// Also provide the full text of the selected options in <select>.
					// Primary use for this is the edit summary in handleDecline().
					if ( element.nodeName.toLowerCase() === 'select' ) {
						allTexts = [];

						$element.find( 'option:selected' ).each( function () {
							allTexts.push( $( this ).text() );
						} );

						data[ element.id + 'Texts' ] = allTexts;
					}
				}

				data[ element.id ] = value;
			} );

			return data;
		},

		/**
		 * Creates an <a> element that links to a given page.
		 * @param {string} pagename - The title of the page.
		 * @param {string} displayTitle - What gets shown by the link.
		 * @param {boolean} [newTab=true] - Whether to open page in a new tab.
		 * @return {jQuery} <a> element
		 */
		makeLinkElementToPage: function ( pagename, displayTitle, newTab ) {
			var actualTitle = pagename.replace( /_/g, ' ' );

			// newTab is an optional parameter.
			newTab = ( typeof newTab === 'undefined' ) ? true : newTab;

			return $( '<a>' )
				.attr( 'href', mw.util.getUrl( actualTitle ) )
				.attr( 'id', 'afch-cat-link-' + pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) )
				.attr( 'title', actualTitle )
				.text( displayTitle || actualTitle )
				.attr( 'target', newTab ? '_blank' : '_self' );
		},

		/**
		 * Creates an <a> element that links to a random page in the given category.
		 * @param {string} pagename - The name of the category (without the namespace).
		 * @param {string} displayTitle - What gets shown by the link.
		 * @return {jQuery} <a> element
		 */
		makeLinkElementToCategory: function ( pagename, displayTitle ) {
			var linkElement = AFCH.makeLinkElementToPage( 'Special:RandomInCategory/' + pagename, displayTitle, false ),
				linkText = displayTitle || pagename.replace( /_/g, ' ' ),
				request = {
					action: 'query',
					titles: 'Category:' + pagename,
					prop: 'categoryinfo'
				},
				linkSpan = $( '<span>' ).append( linkElement ),
				countSpanId = 'afch-cat-count-' + pagename
					.toLowerCase()
					.replace( / /g, '-' )
					.replace( /\//g, '-' );

			linkSpan.append( $( '<span>' ).attr( 'id', countSpanId ) );

			AFCH.api.get( request )
				.done( function ( data ) {
					if ( data.query.pages && !data.query.pages[ '-1' ] ) {
						var pageKey = Object.keys( data.query.pages )[ 0 ],
							pagesCount = data.query.pages[ pageKey ].categoryinfo.pages;
						$( '#' + countSpanId ).text( ' (' + pagesCount + ')' );

						// Disable link if there aren't any pages
						$( '#afch-cat-link-' + pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) ).replaceWith( displayTitle );
					}
				} );

			return linkSpan;
		},

		/**
		 * Converts [[wikilink]] -> <a>
		 *
		 * @param {string} wikicode
		 * @return {string}
		 */
		convertWikilinksToHTML: function ( wikicode ) {
			var newCode = wikicode,
				wikilinkRegex = /\[\[(.*?)\s*(?:\|\s*(.*?))?\]\]/g,
				wikilinkMatch = wikilinkRegex.exec( wikicode );

			while ( wikilinkMatch ) {
				var title = wikilinkMatch[ 1 ],
					displayTitle = wikilinkMatch[ 2 ],
					newLink = AFCH.makeLinkElementToPage( title, displayTitle );

				// Replace the wikilink with the new <a> element
				newCode = newCode.replace( wikilinkMatch[ 0 ], AFCH.jQueryToHtml( newLink ) );

				// Increment match
				wikilinkMatch = wikilinkRegex.exec( wikicode );
			}

			return newCode;
		},

		/**
		 * Returns the relative time that has elapsed between an oldDate and a nowDate
		 * @param {Date|string} old (if it is a string it will be assumed to be a
		 *                           MediaWiki timestamp and converted to a Date first)
		 * @param {Date} now optional, defaults to `new Date()`
		 * @return {string}
		 */
		relativeTimeSince: function ( old, now ) {
			var oldDate = typeof old === 'object' ? old : AFCH.mwTimestampToDate( old ),
				nowDate = typeof now === 'object' ? now : new Date(),
				msPerMinute = 60 * 1000,
				msPerHour = msPerMinute * 60,
				msPerDay = msPerHour * 24,
				msPerMonth = msPerDay * 30,
				msPerYear = msPerDay * 365,
				elapsed = nowDate - oldDate,
				amount, unit;

			if ( elapsed < msPerMinute ) {
				amount = Math.round( elapsed / 1000 );
				unit = 'second';
			} else if ( elapsed < msPerHour ) {
				amount = Math.round( elapsed / msPerMinute );
				unit = 'minute';
			} else if ( elapsed < msPerDay ) {
				amount = Math.round( elapsed / msPerHour );
				unit = 'hour';
			} else if ( elapsed < msPerMonth ) {
				amount = Math.round( elapsed / msPerDay );
				unit = 'day';
			} else if ( elapsed < msPerYear ) {
				amount = Math.round( elapsed / msPerMonth );
				unit = 'month';
			} else {
				amount = Math.round( elapsed / msPerYear );
				unit = 'year';
			}

			if ( amount !== 1 ) {
				unit += 's';
			}

			return [ amount, unit, 'ago' ].join( ' ' );
		},

		/**
		 * Converts an element into a toggle for another element
		 * @param {string} toggleSelector When clicked, will show/hide elementSelector
		 * @param {string} elementSelector Element(s) to be shown or hidden
		 * @param {string} showText e.g. "Show the div"
		 * @param {string} hideText e.g. "Hide the div"
		 */
		makeToggle: function ( toggleSelector, elementSelector, showText, hideText ) {
			// Remove current click handlers
			$( toggleSelector ).off( 'click' );

			// If show is true, we make the element visible and display hideText in
			// the toggle. Otherwise, we hide the element and display showText.
			function toggleState( show ) {
				$( elementSelector ).toggleClass( 'hidden', !show );
				$( toggleSelector ).text( show ? hideText : showText );
			}

			// Update everythign to match current state of the element
			toggleState( $( elementSelector ).is( ':visible' ) );

			// Add the new click handler
			$( document ).on( 'click', toggleSelector, function () {
				toggleState( $( elementSelector ).hasClass( 'hidden' ) );
			} );
		},

		/**
		 * Gets the full raw HTML content of a jQuery object
		 * @param {jQuery} $element
		 * @return {string}
		 */
		jQueryToHtml: function ( $element ) {
			return $( '<div>' ).append( $element ).html();
		},

		/**
		 * Given a string, returns by default a Date() object
		 * or, if mwstyle is true, a MediaWiki-style timestamp
		 *
		 * If there is no match, return false
		 *
		 * @param {string} string string to parse
		 * @return {Date|integer}
		 */
		parseForTimestamp: function ( string, mwstyle ) {
			var exp, match, date;

			exp = new RegExp( '(\\d{1,2}):(\\d{2}), (\\d{1,2}) ' +
				'(January|February|March|April|May|June|July|August|September|October|November|December) ' +
				'(\\d{4}) \\(UTC\\)', 'g' );

			match = exp.exec( string );

			if ( !match ) {
				return false;
			}

			date = new Date();
			date.setUTCFullYear( match[ 5 ] );
			date.setUTCMonth( mw.config.get( 'wgMonthNames' ).indexOf( match[ 4 ] ) - 1 ); // stupid javascript
			date.setUTCDate( match[ 3 ] );
			date.setUTCHours( match[ 1 ] );
			date.setUTCMinutes( match[ 2 ] );
			date.setUTCSeconds( 0 );

			if ( mwstyle ) {
				return AFCH.dateToMwTimestamp( date );
			}

			return date;
		},

		/**
		 * Parses a MediaWiki internal YYYYMMDDHHMMSS timestamp
		 * @param {string} string
		 * @return {Date|bool} if unable to parse, returns false
		 */
		mwTimestampToDate: function ( string ) {
			var date, dateMatches = /(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/.exec( string );

			// If it *isn't* actually a MediaWiki-style timestamp, pass directly to date
			if ( dateMatches === null ) {
				date = new Date( string );
			// Otherwise use Date.UTC to assemble a date object using UTC time
			} else {
				date = new Date( Date.UTC(
					dateMatches[ 1 ], dateMatches[ 2 ] - 1, dateMatches[ 3 ], dateMatches[ 4 ], dateMatches[ 5 ], dateMatches[ 6 ]
				) );
			}

			// If invalid, return false
			if ( isNaN( date.getUTCMilliseconds() ) ) {
				return false;
			}

			return date;
		},

		/**
		 * Converts a Date object to YYYYMMDDHHMMSS format
		 * @param {Date} date
		 * @return {number}
		 */
		dateToMwTimestamp: function ( date ) {
			return +( date.getUTCFullYear() +
				( '0' + ( date.getUTCMonth() + 1 ) ).slice( -2 ) +
				( '0' + date.getUTCDate() ).slice( -2 ) +
				( '0' + date.getUTCHours() ).slice( -2 ) +
				( '0' + date.getUTCMinutes() ).slice( -2 ) +
				( '0' + date.getUTCSeconds() ).slice( -2 ) );
		},

		/**
		 * Returns the value of the specified URL parameter. By default it uses
		 * the current window's address. Optionally you can pass it a custom location.
		 * It returns null if the parameter is not present, or an empty string if the
		 * parameter is empty.
		 *
		 * @param {string} name parameter to get
		 * @param {string} url optional; custom url to search
		 * @return {string|null} value, or null if not present
		 */
		getParam: function () {
			return mw.util.getParamValue.apply( this, arguments );
		},

		/**
		 * Given a code for an AfC decline reason (e.g. "v"), returns some HTML code
		 * describing the reason.
		 *
		 * @param {string} code an AfC decline reason code
		 * @return {$.Deferred} Resolves with the requested HTML
		 */
		getReason: function ( code ) {
			var deferred = $.Deferred();

			$.post( 'https://en.wikipedia.org/api/rest_v1/transform/wikitext/to/html',
				'wikitext={{AFC submission/comments|' + code + '}}&body_only=true',
				function ( data ) {
					deferred.resolve( data );
				}
			);

			return deferred;
		}

	} );

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
