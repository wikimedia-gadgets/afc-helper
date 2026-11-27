// <nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {
		/**
		 * Add a signature to text if it does not already have one.
		 *
		 * @param {string} text
		 * @return {string}
		 */
		addSignature: function ( text ) {
			text = text.trim();
			if ( text.indexOf( '~~~~' ) === -1 ) {
				text += ' ~~~~';
			}
			return text;
		},

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
		 * Converts [[wikilink]] -> <a>
		 *
		 * @param {string} wikicode
		 * @return {string}
		 */
		convertWikilinksToHTML: function ( wikicode ) {
			let newCode = wikicode,
				wikilinkRegex = /\[\[(.*?)\s*(?:\|\s*(.*?))?\]\]/g,
				wikilinkMatch = wikilinkRegex.exec( wikicode );

			while ( wikilinkMatch ) {
				const title = wikilinkMatch[ 1 ],
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
		 * Remove empty section at the end of the draft. Empty sections at the end of drafts
		 * frequently happen because of how the "Resubmit" button on the "declined" template
		 * works. The empty section may have categories after it - keep them there.
		 *
		 * @param {string} wikicode
		 * @return {string} wikicode
		 */
		removeEmptySectionAtEnd: function ( wikicode ) {
			// Hard to write a regex that doesn't catastrophic backtrack while still saving multiple categories and multiple blank lines. So we'll do this the old-fashioned way...

			// Divide wikitext into lines
			let lines = wikicode.split( '\n' );

			// Buffers
			const linesToKeep = [];
			let i;

			// Crawl the list of lines backward (bottom up)
			let count = lines.length;
			for ( i = count - 1; i >= 0; i-- ) {
				const line = lines[ i ];
				const isWhitespace = line.match( /^\s*$/ );
				const isCategory = line.match( /^\s*\[\[:?Category:/i );
				const isHeading = line.match( /^==[^=]+==$/i );

				if ( isWhitespace || isCategory ) {
					linesToKeep.push( line );
					continue;
				} else if ( isHeading ) {
					break;
				}

				// If it's something besides the three things above, such as text, then there's no blank headings to delete. Return unaltered wikitext. We're done.
				return wikicode;
			}

			// Delete the lines we checked from the array of lines. We'll be replacing these with new lines in a moment.
			lines = lines.slice( 0, i );

			// Add the categories and blank lines back
			// Need to iterate backward, same as the loop above
			count = linesToKeep.length;
			for ( let j = count - 1; j >= 0; j-- ) {
				const lineToKeep = linesToKeep[ j ];
				lines.push( lineToKeep );
			}

			wikicode = lines.join( '\n' );

			// The old algorithm had some quirks related to adding and removing \n. Mimic the old algorithm for now, so that unit tests pass and users don't have to get used to new behavior.
			if ( wikicode.match( /\n\n$/ ) ) {
				wikicode = wikicode.slice( 0, -1 );
			}
			wikicode = wikicode.replace( /\n(\n\n\[\[:?Category:)/i, '$1' );

			return wikicode;
		},

		/**
		 * @param {string} wikicode Wikitext of the draft talk page
		 * @param {string} newAssessment Value of "Article assessment" dropdown list, or "" if blank
		 * @param {number} revId Revision ID of the draft that is being accepted
		 * @param {boolean} isBiography Value of the "Is the article a biography?" check box
		 * @param {Array} wikiProjectsToAddOrKeep Value of the "Add WikiPrjects" part of the form. The <input> is a chips interface called jquery.chosen. Note that if there are existing WikiProject banners on the page, the form will auto-add those to the "Add WikiProjects" part of the form when it first loads.
		 * @param {string} lifeStatus Value of "Is the subject alive?" dropdown list ("unknown", "living", "dead")
		 * @param {string} subjectName Value of the "Subject name (last, first)" text input, or "" if blank
		 * @param {Array} [removedWikiProjects] Template names explicitly removed from the form
		 * @return {Object} wikicode
		 */
		addTalkPageBanners: function ( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName, removedWikiProjects ) {
			if ( removedWikiProjects && removedWikiProjects.length ) {
				wikicode = AFCH.removeTemplates( wikicode, removedWikiProjects );
			}

			// delete |class={{{class}}} throughout the page. this is a bit too broad, but is easier than rewriting the below regexes to deal with nested templates
			wikicode = wikicode.replace( /\s*\|\s*class\s*=\s*\{\{\{class\}\}\}/i, '' );

			// build an array of all banners already on page
			const bannerTemplates = 'wikiproject (?!banner)|football|oka';
			const bannerTemplateRegEx = new RegExp( '{{(?:' + bannerTemplates + ')[^}]*}}', 'gi' );
			let banners = wikicode.match( bannerTemplateRegEx ) || [];

			// delete all banners already on page
			banners.forEach( ( v ) => {
				wikicode = wikicode.replace( v, '' );
			} );

			// delete shell already on page
			const bannerShellTemplates = 'WikiProject banner shell|WikiProjectBanners|WikiProject Banners|WPB|WPBS|WikiProject cooperation shell|Wikiprojectbannershell|WikiProject Banner Shell|Wpb|WPBannerShell|Wpbs|Wikiprojectbanners|WP Banner Shell|WP banner shell|Bannershell|Wikiproject banner shell|WIkiProjectBanner Shell|WikiProjectBannerShell|WikiProject BannerShell|Coopshell|WikiprojectBannerShell|WikiProject Shell|Scope shell|Project shell|WikiProject shell|WikiProject banner|Wpbannershell|Multiple wikiprojects|Wikiproject banner holder|Project banner holder|WikiProject banner shell\\/test1|Article assessment|WikiProject bannershell';
			// Leave shells containing other templates intact rather than deleting their contents.
			const bannerShellRegEx = new RegExp( '{{(?:' + bannerShellTemplates + ')[^{}]*}}', 'is' );
			wikicode = wikicode.replace( bannerShellRegEx, '' );

			// trim. makes unit tests more stable
			wikicode = wikicode.trim();

			// Add AFC banner to array.
			// Put at top for historical reasons. People are used to it being there.
			banners.unshift(
				'{{subst:WPAFC/article' +
				( revId ? ' |oldid=' + revId : '' ) +
				'}}'
			);

			// delete existing biography banner. when accepting, reviewer is forced to choose if it's a biography or not, so we'll add (or not add) our own biography banner later
			banners = banners.filter( ( value ) => !value.match( /^{{WikiProject Biography/i ) );

			// add biography banner to array. and add |blp= and |listas= to banner shell
			let bannerShellExtraParams = '';
			if ( isBiography ) {
				banners.push(
					'{{WikiProject Biography}}'
				);

				if ( lifeStatus === 'living' ) {
					bannerShellExtraParams += ' |blp=yes';
				} else if ( lifeStatus === 'dead' ) {
					bannerShellExtraParams += ' |blp=no';
				}

				if ( subjectName ) {
					bannerShellExtraParams += ' |listas=' + subjectName;
				}
			}

			// add disambiguation banner to array
			if ( newAssessment === 'Disambig' ) {
				banners.push( '{{WikiProject Disambiguation}}' );
			}

			// add banners selected in UI to array
			for ( const key in wikiProjectsToAddOrKeep ) {
				banners.push( '{{' + wikiProjectsToAddOrKeep[ key ] + '}}' );
			}

			// remove duplicate banners, case insensitive
			banners = AFCH.removeDuplicateBanners( banners );

			// delete |class= from banners in array
			banners = banners.map( ( value ) => value.replace( /\s*\|\s*class\s*=\s*[^|}]*([\n|}])/, '$1' ) );

			// The banner shell automatically detects several classes. If it's one of these auto detected classes, write |class= blank instead of writing the class.
			if ( [ 'Disambig', 'Template', 'Redirect', 'Portal', 'Project', 'NA' ].indexOf( newAssessment ) !== -1 ) {
				newAssessment = '';
			}

			// Convert array back to wikitext and append to top of talk page.
			// Always add a shell even if it's just wrapping one banner, for code simplification reasons.
			// Add |class= to shell.
			// Add |1=. Improves readability when lots of other parameters present.
			wikicode = '{{WikiProject banner shell' +
				( newAssessment ? ' |class=' + newAssessment : '' ) +
				bannerShellExtraParams +
				' |1=\n' +
				banners.join( '\n' ) +
				'\n}}\n' +
				wikicode;

			// add an extra line break between the last template and the first heading
			wikicode = wikicode.replace( /}}\n==/, '}}\n\n==' );

			// trim. makes unit tests more stable
			wikicode = wikicode.trim();

			return wikicode;
		},

		/**
		 * Remove complete transclusions of the specified templates, including nested parameters.
		 * Ignores comments and nowiki, pre, source, syntaxhighlight and math tags.
		 * Removes the line break for standalone templates.
		 *
		 * @param {string} wikicode
		 * @param {Array} names
		 * @return {string}
		 */
		removeTemplates: function ( wikicode, names ) {
			function normalizeName( name ) {
				return name.replace( /_/g, ' ' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
			}

			const removedNames = names.map( normalizeName );
			const tokens = /<!--|<(?:nowiki|pre|source|syntaxhighlight|math)\b[^>]*>|\{\{\{|\{\{|\}\}\}|\}\}/gi;
			const stack = [];
			const ranges = [];
			let token;
			while ( ( token = tokens.exec( wikicode ) ) ) {
				const text = token[ 0 ];
				if ( text === '<!--' ) {
					const end = wikicode.indexOf( '-->', tokens.lastIndex );
					tokens.lastIndex = end === -1 ? wikicode.length : end + 3;
				} else if ( text.charAt( 0 ) === '<' ) {
					if ( !/\/\s*>$/.test( text ) ) {
						const tag = text.match( /^<(\w+)/ )[ 1 ];
						const close = new RegExp( '<\\/' + tag + '\\s*>', 'gi' );
						close.lastIndex = tokens.lastIndex;
						const end = close.exec( wikicode );
						tokens.lastIndex = end ? close.lastIndex : wikicode.length;
					}
				} else if ( text === '{{{' || text === '{{' ) {
					stack.push( { start: token.index, parameter: text === '{{{' } );
				} else if ( stack.length ) {
					const top = stack[ stack.length - 1 ];
					if ( top.parameter && text === '}}' ) {
						continue;
					}
					if ( !top.parameter && text === '}}}' ) {
						tokens.lastIndex--;
					}
					stack.pop();
					if ( !top.parameter ) {
						const name = wikicode.slice( top.start + 2, tokens.lastIndex ).match( /^\s*(?:template\s*:\s*)?([^{}|]+?)(?=\s*(?:\||}}))/i );
						if ( name && removedNames.indexOf( normalizeName( name[ 1 ] ) ) !== -1 ) {
							ranges.push( { start: top.start, end: tokens.lastIndex } );
						}
					}
				}
			}

			ranges.sort( ( a, b ) => a.start - b.start || b.end - a.end );
			let result = '', offset = 0;
			ranges.forEach( ( range ) => {
				if ( range.start < offset ) {
					return;
				}
				const lineStart = wikicode.lastIndexOf( '\n', range.start - 1 ) + 1;
				if ( lineStart >= offset && /^[ \t]*$/.test( wikicode.slice( lineStart, range.start ) ) &&
					/^\r?\n/.test( wikicode.slice( range.end ) ) ) {
					range.start = lineStart;
					range.end += wikicode.charAt( range.end ) === '\r' ? 2 : 1;
				}
				result += wikicode.slice( offset, range.start );
				offset = range.end;
			} );
			return result + wikicode.slice( offset );
		},

		/**
		 * In an array of templates, remove duplicate templates, case insensitive.
		 *
		 * @param {Array} banners [ '{{WikiProject Australia}}', {{wikiproject australia}}', '{{WikiProject Australia|class=B}}' ]
		 * @return {Array} banners [ '{{WikiProject Australia}}' ]
		 */
		removeDuplicateBanners: function ( banners ) {
			const uniqueBanners = [];
			const bannerMap = {};
			banners.forEach( ( banner ) => {
				let bannerKey = banner.toLowerCase().match( /{{[^|}]+/ )[ 0 ];
				// get rid of whitespace at the end of the template name
				bannerKey = bannerKey.trim();
				if ( !bannerMap[ bannerKey ] ) {
					uniqueBanners.push( banner );
					bannerMap[ bannerKey ] = true;
				}
			} );
			return uniqueBanners;
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
