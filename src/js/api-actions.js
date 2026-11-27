// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {
		/**
		 * Perform a specific action
		 */
		actions: {
			failEdit: function ( err, deferred, status ) {
				deferred.reject( err );
				status.update( 'Error while saving $1: ' + JSON.stringify( err ) );
			},

			postEdit: function ( request, options, deferred, status ) {
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
							AFCH.actions.failEdit( data, deferred, status );
						}
					} )
					.fail( ( err ) => {
						AFCH.actions.failEdit( err, deferred, status );
					} );
			},

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

				// Resolve redirects first so both edit APIs receive the final title. We could use the redirects parameter in the edit API only, but double checking redirects two different ways is complicated and makes the tests harder to read.
				if ( options.followRedirects ) {
					AFCH.api.get( {
						action: 'query',
						prop: 'info',
						titles: pagename,
						redirects: true
					} ).done( ( data ) => {
						const pages = data.query && data.query.pages,
							pageIds = pages ? Object.keys( pages ) : [],
							page = pageIds.length ? pages[ pageIds[ 0 ] ] : null;

						if ( !page || !page.title ) {
							AFCH.actions.failEdit( data, deferred, status );
							return;
						}

						request[ options.subscribe ? 'page' : 'title' ] = page.title;
						AFCH.actions.postEdit( request, options, deferred, status );
					} ).fail( ( err ) => {
						AFCH.actions.failEdit( err, deferred, status );
					} );
				} else {
					AFCH.actions.postEdit( request, options, deferred, status );
				}

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
			 * Posts a notification to the user's talk page, following redirects while editing.
			 * Appends to the resolved page, creating a talk header if it is missing.
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
				} ).fail( ( err ) => {
					deferred.reject( err );
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
		}
	} );

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
