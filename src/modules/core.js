//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/core.js]]
( function ( AFCH, $, mw ) {
	AFCH = $.extend( AFCH, {

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

			if ( AFCH.consts.beta ) {
				// Load css
				mw.loader.load( AFCH.consts.scriptpath + '?action=raw&ctype=text/css&title=MediaWiki:Gadget-afchelper.css', 'text/css' );
				// Load dependencies
				mw.loader.load( [ 'mediawiki.feedback', 'mediawiki.api', 'jquery.chosen' ] );
			}

			// Set up all the other good things
			AFCH.afterLoad();

			// And finally load the subscript
			$.getScript( AFCH.consts.baseurl + '/' + type + '.js' );
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
				nullstatus: { update: function () { return; } }
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
					bugsLink: 'https://github.com/WPAFC/afch/issues/new',
					bugsListLink: 'https://github.com/WPAFC/afch/issues?labels=REWRITE&state=open'
				} );
			$( '<span>' )
				.text( 'Give feedback!' )
				.addClass( 'afch-feedbackLink' )
				.click( function () {
					feedback.launch( {
						subject: type ? 'Feedback about ' + type : 'AFCH feedback',
						contents: 'Replace this with your error report or feedback, positive or negative. Please be as detailed as possible!'
					} );
				} )
				.appendTo( $element );
		},


		/**
		 * Represents a page, mainly a wrapper for various actions
		 */
		Page: function ( name ) {
			var pg = this;

			this.Title = new mw.Title( name );
			this.additionalData = {};

			this.getText = function ( usecache ) {
				var deferred = $.Deferred();

				if ( usecache && pg.pageText ) {
					deferred.resolve( pg.pageText );
				}

				AFCH.action.getPageText( pg.Title.getPrefixedText(), { hide: true, moreProps: 'timestamp' } )
					.done( function ( pagetext, data ) {
						pg.pageText = pagetext;
						// Teehee, let's use this opportunity to get some data for later
						pg.additionalData.lastModified = new Date( data.timestamp );

						deferred.resolve( pg.pageText );
					} );

				return deferred;
			};

			this.getLastModifiedDate = function () {
				// FIXME: I guess the nice thing to do would be to make an API call if necessary.
				// But that seems like a huge pain and would require some more functionality. I'm
				// lazy. For now we just get the text first. Stupid, I know.
				var deferred = $.Deferred();
				pg.getText( true ).done( deferred.resolve( pg.additionalData.lastModified ) );
				return deferred;
			};
		},

		/**
		 * Perform a specific action
		 */
		action: {
			/**
			 * Gets the full wikicode content of a page
			 * @param {string} pagename The page to get the contents of, namespace included
			 * @param {object} options Object with properties:
			 *                          hide: {bool} set to true to hide the API request in the status log
			 *                          moreProps: {string} additional properties to request
			 * @return {$.Deferred} Resolves with pagetext and full data available as parameters
			 */
			getPageText: function ( pagename, options ) {
				var status, request, rvprop = 'content',
					deferred = $.Deferred();

				if ( !options.hide ) {
					status = new AFCH.status.Element( 'Getting $1...',
						{ '$1': $( '<a>' )
							.attr( 'href', mw.util.getUrl( pagename ) )
							.text( pagename )
						} );
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

				AFCH.api.get( request )
					.done( function ( data ) {
						var rev, id = data.query.pageids[0];
						if ( id && data.query.pages ) {
							rev = data.query.pages[id].revisions[0];
							deferred.resolve( rev['*'], rev );
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
			 *                          patrol: {bool} by default true; set to false to not patrol the page
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
						{ '$1': $( '<a>' )
							.attr( 'href', mw.util.getUrl( pagename ) )
							.text( pagename )
						} );
				} else {
					status = AFCH.consts.nullstatus;
				}

				request = {
					action: 'edit',
					text: options.contents,
					title: pagename,
					summary: options.summary + AFCH.prefs.summaryAd
				};

				if ( options.mode ) {
					request[options.mode] = true;
				}

				AFCH.api.post( request )
					.done( function ( data ) {
						if ( data && data.edit && data.edit.result && data.edit.result === 'Success' ) {
							deferred.resolve( data );
							status.update( 'Saved $1' );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result??
							status.update( 'Error saving $1: ' + JSON.stringify( data ) );
						}
					} )
					.fail( function ( err ) {
						deferred.reject( err );
						status.update( 'Error saving $1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
			 * Deletes a page
			 * @param  {string} pagename Page to delete
			 * @param  {string} reason   Reason for deletion; shown in deletion log
			 * @return {bool}            Page deleted successfully
			 */
			deletePage: function ( pagename, reason ) {
				// FIXME: implement
				return false;
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
			notifyUser: function ( user, data ) {
				var deferred = $.Deferred,
					userPage = new mw.Title( user, 3 ); // User talk namespace

				AFCH.actions.editPage( userPage, {
					contents: data.message,
					summary: data.summary,
					mode: 'appendtext',
					statusText: 'Notifying',
					hide: data.hide || false
				} )
				.done( function () {
					deferred.resolve();
				} )
				.fail( function () {
					deferred.reject();
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
				var text = AFCH.msg.store[key] || '<' + key + '>';

				// Perform substitutions if necessary
				if ( substitutions ) {
					$.each( substitutions, function ( original, replacement ) {
						text = text.replace( original, replacement );
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
					AFCH.msg.store[key] = value;
				}
			}
		},

		/**
		 * Use Parsoid web api to parse the given wikitext
		 * @param {string} text Text to parse
		 * @return {$.Deferred} Resolves with a list of parsed templates
		 */
		parseTemplates: function ( text ) {
			var deferred = $.Deferred(),
				status = new AFCH.status.Element( 'Parsing templates using Parsoid...' );

			// Sneakily use the Parsoid API which Flow has oh-so-nicely exposed
			// for us. Hopefully they don't, y'know, suddenly remove it.
			AFCH.api.get( {
				action: 'flow-parsoid-utils',
				from: 'wikitext',
				to: 'html',
				content: text,
				title: 'Main Page' // Teehee
			} ).done( function ( data ) {
				// Use the Parsoid data-mw attributes to gather a bunch of data about
				// the templates on the page, denoted by mw:Transclusion
				var rawTemplates = $( data['flow-parsoid-utils'].content ).find( '[typeof="mw:Transclusion"]' ),
					templates = [];

				rawTemplates.each( function ( _, t ) {
					// Get the data-mw attribute and then drill down through the JSON, whoopee!
					var tdata = ( $( t ).data( 'mw' ) ).parts[0].template,
						tmpl = { target: tdata.target.wt, params: {} };

					$.each( tdata.params, function ( k, v ) {
						tmpl.params[k] = v.wt;
					} );

					templates.push( tmpl );
				} );

				status.update( 'Templates parsed successfully!' );
				deferred.resolve( templates );
			} )
			.fail( function ( err ) {
				status.update( 'Error parsing templates: ' + JSON.stringify( err ) );
				deferred.reject( err );
			} );

			return deferred;
		}
	} );

	/**
	 * Removes a key from a given object and returns the value of the key
	 * @param {string} key
	 * @return {mixed}
	 */
	Object.prototype.getAndDelete = function ( key ) {
		var v = this[key];
		delete this[key];
		return v;
	};

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
