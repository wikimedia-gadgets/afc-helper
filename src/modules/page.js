// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {
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
		}
	} );

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
