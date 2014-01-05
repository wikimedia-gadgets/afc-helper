//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/core.js]]

( function ( AFCH, $, mw ) {
	$.extend( AFCH, {

		/**
		 * Prepares the AFCH gadget by setting constants and checking environment
		 * @return {bool} Whether or not all setup functions executed successfully
		 */
		beforeLoad: function () {
			// Check requirements
			if ( 'ajax' in $.support && !$.support.ajax ) {
				AFCH.error = 'AFCH requires AJAX';
				return false;
			}

			if ( AFCH.consts.baseurl.indexOf( 'MediaWiki:' + 'Gadget-afchelper.js' ) === -1 ) {
				AFCH.consts.beta = true;
			}

			return true;
		},

		/**
		 * Loads the subscript
		 * @param {string} type Which type of script to load:
		 *                      'redirects' or 'ffu' or 'submissions'
		 * @return {bool} Whether or not a subscript was loaded
		 */
		load: function ( type ) {
			// Run setup function
			AFCH.beforeLoad();

			// Load css
			mw.loader.load( AFCH.consts.scriptpath + '?action=raw&ctype=text/css&title=MediaWiki:Gadget-afchelper.css', 'text/css' );

			// Load dependencies if required
			if ( AFCH.consts.beta ) {
				mw.loader.load( [ 'mediawiki.feedback', 'mediawiki.api', 'jquery.chosen' ] );
			}

			// Set up all the other good things
			AFCH.afterLoad();

			// And finally load the subscript
			mw.loader.load( AFCH.consts.baseurl + '/' + type + '.js' );
		},

		/**
		 * Loads a bunch of necessary thingies, like prefs and the api and constants and unicorns!
		 */
		afterLoad: function () {
			// FIXME: Add real pref code
			AFCH.prefs = {};
			AFCH.api = new mw.Api();

			// Add more constants
			$.extend( AFCH.consts, {
				// Edit token used in api requests
				editToken: mw.user.tokens.get('editToken'),
				// Full page name, "Wikipedia talk:Articles for creation/sandbox"
				pagename: mw.config.get( 'wgPageName' ).replace( '_', ' ' ),
				// Link to the current page, "/wiki/Wikipedia talk:Articles for creation/sandbox"
				pagelink: mw.util.getUrl(),
				// Used when status is disabled
				nullstatus: { update: function () {} }
			} );
		},

		/**
		 * Appends a feedback link to the given element
		 * @param {object} $element The jQuery element to which the link should be appended
		 * @param {string} type (optional) The part of AFCH that feedback is being given for, e.g. "files for upload"
		 */
		initFeedback: function ( $element, type ) {
			var feedback = new mw.Feedback( {
					title: new mw.Title( 'Wikipedia talk:Articles for creation/Helper script/Feedback' ),
					bugsLink: '//github.com/WPAFC/afch/issues/new',
					bugsListLink: '//github.com/WPAFC/afch/issues?labels=REWRITE&state=open'
				} ),
				feedbackLink = $( '<span>' )
					.text( 'Give feedback!' )
					.addClass( 'feedbackLink' )
					.click( function () {
						feedback.launch( {
							subject: type ? 'Feedback about ' + type : 'AFCH feedback',
							contents: 'Replace this with your error report or feedback, positive or negative. Please be as detailed as possible!'
						} );
					} )
					.appendTo( $element );
			} );
		},

		/**
		 * Perform a specific action
		 * FIXME: callback functions? Or else return $.Promise()?
		 */
		action: {
			/**
			 * Gets the full wikicode content of a page
			 * @param {string} pagename The page to get the contents of, namespace included
			 * @param {bool} hide Set to true to hide the API request in the status log
			 */
			getPageText: function ( pagename, hide ) {
				var status, request;

				if ( !options.hide ) {
					status = new AFCH.status.Element( 'Getting $1...',
						{ '$1': $( '<a>' )
							.attr( 'href', mw.util.getUrl( pagename ) ),
							.text( pagename )
						} );
				} else {
					status = AFCH.consts.nullstatus;
				}

			request = {
				action: 'query',
				prop: 'revisions',
				rvprop: 'content',
				format: 'json',
				indexpageids: true,
				titles: pagename
			};

			AFCH.api.post( request )
				.done( function ( data ) {
					if ( data && data.edit && data.edit.result && data.edit.result == 'Success' ) {
						status.update( 'Got $1' );
					} else {
						// FIXME: get error info from API result
					}
				} )
				.error( function ( err ) {
					// FIXME
				} );
			},

			/**
			 * Modifies a page's content
			 * @param {string} pagename The page to be modified, namespace included
			 * @param {object} options Object with properties:
			 *                         	contents: {string} the text to add to/replace the page,
			 *                         	summary: {string} edit summary, will have the edit summary ad at the end,
			 *                         	createonly: {bool} set to true to only edit the page if it doesn't exist,
			 *                         	mode: {string} 'appendtext' or 'prependtext'; default: (replace everything)
			 *                         	patrol: {bool} by default true; set to false to not patrol the page
			 *                         	hide: {bool} Set to true to supress logging in statusWindow
			 * @return {bool} Page was saved successfully
			 */
			editPage: function ( pagename, options ) {
				var status, request;

				if ( !options.hide ) {
					status = new AFCH.status.Element( 'Editing $1...',
						{ '$1': $( '<a>' )
							.attr( 'href', mw.util.getUrl( pagename ) ),
							.text( pagename )
						} );
				} else {
					status = AFCH.consts.nullstatus;
				}

				if ( options === undefined ) {
					options = {};
				}

				request = {
					action: 'edit',
					text: options.contents,
					title: pagename,
					summary: options.summary + AFCH.prefs.summaryAd
				}

				if ( options.mode ) {
					request[mode] = true;
				}

				AFCH.api.post( request )
					.done( function ( data ) {
						if ( data && data.edit && data.edit.result && data.edit.result == 'Success' ) {
							status.update( 'Saved $1' );
						} else {
							// FIXME: get error info from API result
						}
					} )
					.error( function ( err ) {
						// FIXME
					} );
			},

			/**
			 * Deletes a page
			 * @param  {string} pagename Page to delete
			 * @param  {string} reason   Reason for deletion; shown in deletion log
			 * @return {bool}            Page deleted successfully
			 */
			deletePage: function ( pagename, reason ) {
				// FIXME: implement
				return true;
			}
		},

		/**
		 * Series of functions for logging statuses and whatnot
		 */
		status: {

			/**
			 * Represents the status container, overwritten by init()
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
					.prependTo( location ? location : '#mw-content-text' );
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
				 * @param  {string} html Content of the element
				 *                       Can use $1 to represent the page name
				 */
				this.update = function ( html ) {
					// First run the substutions
					$.each( this.substitutions, function ( key, value ) {
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
					substitutions = { '$1': AFCH.consts.pagelink };
				} else {
					substitutions = $.extend( {}, { '$1': AFCH.consts.pagelink }, substitutions );
				}

				this.substitutions = substitutions;

				this.element = $( '<li>' )
					.appendTo( AFCH.status.container );

				this.update( initialText );
			}
		},
	};
} )( AFCH, jQuery, mediawiki );
//</nowiki>
