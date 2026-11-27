// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {
		/**
		 * Removes a key from a given object and returns the value of the key
		 *
		 * @param {Object} object
		 * @param {string} key
		 * @return {Mixed}
		 */
		getAndDelete: function ( object, key ) {
			const v = object[ key ];
			delete object[ key ];
			return v;
		},

		/**
		 * Removes all occurences of a value from an array
		 *
		 * @param {Array} array
		 * @param {Mixed} value
		 */
		removeFromArray: function ( array, value ) {
			let index = $.inArray( value, array );
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
		 * @return {Object} object of values, with the ids as keys
		 */
		getFormValues: function ( $selector ) {
			const data = {};

			$selector.each( ( _, element ) => {
				let value, allTexts,
					$element = $( element );

				if ( element.type === 'checkbox' ) {
					value = element.checked;
				} else if ( element.type === 'fieldset' ) {
					value = $element.find( ':checked' ).val();
				} else {
					value = $element.val();

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
		 *
		 * @param {string} pagename - The title of the page.
		 * @param {string} displayTitle - What gets shown by the link.
		 * @param {boolean} [newTab=true] - Whether to open page in a new tab.
		 * @param {boolean} dontFollowRedirects - whether to add &redirect=no to URLs, to prevent auto redirecting when clicked
		 * @return {jQuery} <a> element
		 */
		makeLinkElementToPage: function ( pagename, displayTitle, newTab, dontFollowRedirects ) {
			const actualTitle = pagename.replace( /_/g, ' ' );

			// newTab is an optional parameter.
			newTab = ( typeof newTab === 'undefined' ) ? true : newTab;

			let options = {};
			if ( dontFollowRedirects ) {
				options = { redirect: 'no' };
			}
			const url = mw.util.getUrl( actualTitle, options );

			return $( '<a>' )
				.attr( 'href', url )
				.attr( 'id', 'afch-cat-link-' + pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) )
				.attr( 'title', actualTitle )
				.text( displayTitle || actualTitle )
				.attr( 'target', newTab ? '_blank' : '_self' );
		},

		/**
		 * Creates an <a> element that links to a random page in the given category.
		 *
		 * @param {string} pagename - The name of the category (without the namespace).
		 * @param {string} displayTitle - What gets shown by the link.
		 * @return {jQuery} <a> element
		 */
		makeLinkElementToCategory: function ( pagename, displayTitle ) {
			const linkElement = AFCH.makeLinkElementToPage( 'Special:RandomInCategory/' + pagename, displayTitle, false ),
				request = {
					action: 'query',
					titles: 'Category:' + pagename,
					prop: 'categoryinfo'
				},
				$linkSpan = $( '<span>' ).append( linkElement ),
				countSpanId = 'afch-cat-count-' + pagename
					.toLowerCase()
					.replace( / /g, '-' )
					.replace( /\//g, '-' );

			$linkSpan.append( $( '<span>' ).attr( 'id', countSpanId ) );

			AFCH.api.get( request )
				.done( ( data ) => {
					if ( data.query.pages && !data.query.pages[ '-1' ] ) {
						const pageKey = Object.keys( data.query.pages )[ 0 ],
							pagesCount = data.query.pages[ pageKey ].categoryinfo.pages;
						$( '#' + countSpanId ).text( ' (' + pagesCount + ')' );

						// Disable link if there aren't any pages
						$( '#afch-cat-link-' + pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) ).replaceWith( displayTitle );
					}
				} );

			return $linkSpan;
		},

		/**
		 * Returns the relative time that has elapsed between an oldDate and a nowDate
		 *
		 * @param {Date|string} old (if it is a string it will be assumed to be a
		 *                           MediaWiki timestamp and converted to a Date first)
		 * @param {Date} now optional, defaults to `new Date()`
		 * @return {string}
		 */
		relativeTimeSince: function ( old, now ) {
			let oldDate = typeof old === 'object' ? old : AFCH.mwTimestampToDate( old ),
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
		 *
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
			$( document ).on( 'click', toggleSelector, () => {
				toggleState( $( elementSelector ).hasClass( 'hidden' ) );
			} );
		},

		/**
		 * Gets the full raw HTML content of a jQuery object
		 *
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
		 * @param {boolean} mwstyle convert to a mediawiki-style timestamp?
		 * @return {Date|number}
		 */
		parseForTimestamp: function ( string, mwstyle ) {
			let exp, match, date;

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
		 *
		 * @param {string} string
		 * @return {Date|boolean} if unable to parse, returns false
		 */
		mwTimestampToDate: function ( string ) {
			let date, dateMatches = /(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/.exec( string );

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
		 *
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
		 * @return {jQuery.Deferred} Resolves with the requested HTML
		 */
		getReason: function ( code ) {
			const deferred = $.Deferred();

			$.post( 'https://en.wikipedia.org/api/rest_v1/transform/wikitext/to/html',
				'wikitext={{AfC submission/comments|' + code + '}}&body_only=true',
				( data ) => {
					deferred.resolve( data );
				}
			);

			return deferred;
		}

	} );

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
