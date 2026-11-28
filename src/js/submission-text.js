// <nowiki>
( function ( AFCH, $, mw ) {
	if ( typeof inUnitTestEnvironment === 'undefined' ) {
		if ( mw.config.get( 'wgArticleId' ) === 0 ||
			mw.config.get( 'wgPageContentModel' ) !== 'wikitext' ) {
			return;
		}
	}

	/**
	 * Represents text of an AfC submission
	 *
	 * @param {string} text
	 */
	AFCH.Text = function ( text ) {
		this.text = text;
	};

	AFCH.Text.prototype.get = function () {
		return this.text;
	};

	AFCH.Text.prototype.set = function ( string ) {
		this.text = string;
		return this.text;
	};

	AFCH.Text.prototype.prepend = function ( string ) {
		this.text = string + this.text;
		return this.text;
	};

	AFCH.Text.prototype.append = function ( string ) {
		this.text += string;
		return this.text;
	};

	AFCH.Text.prototype.cleanUp = function ( isAccept ) {
		let text = this.text;
		const commentsToRemove = [
			'Please don\'t change anything and press save',
			'Carry on from here, and delete this comment.',
			'Please leave this line alone!',
			'Just press the "Save page" button below without changing anything! Doing so will submit your article submission for review. ' +
				'Once you have saved this page you will find a new yellow \'Review waiting\' box at the bottom of your submission page. ' +
				'If you have submitted your page previously,(?: either)? the old pink \'Submission declined\' template or the old grey ' +
				'\'Draft\' template will still appear at the top of your submission page, but you should ignore (them|it). Again, please ' +
				'don\'t change anything in this text box. Just press the "Save page" button below.'
		];

		if ( isAccept ) {
			// Remove {{Draft categories}}
			text = text.replace( /\{\{(?:Draft categories|Draftcat)\s*\|((?:\s*\[\[:?Category:[ \S]+?\]\]\s*)*)\s*\}\}/gi, '$1' );

			// Remove {{Draft article}} (and {{Draft}}).
			// Not removed if the |text= parameter is present, which could contain
			// arbitrary wikitext and therefore makes the end of the template harder
			// to detect
			text = text.replace( /\{\{Draft(?!\|\s*text\s*=)(?: article(?!\|\s*text\s*=)(?:\|(?:subject=)?[^|]+)?|\|(?:subject=)?[^|]+)?\}\}/gi, '' );

			// Uncomment cats and templates
			text = text.replace( /\[\[:Category:/gi, '[[Category:' );
			text = text.replace( /\{\{(tl|tlx|tlg)\|(.*?)\}\}/ig, '{{$2}}' );

			const templatesToRemove = [
				'AfC postpone G13',
				'Draft topics',
				'AfC topic',
				'Drafts moved from mainspace',
				'Promising draft'
			];

			templatesToRemove.forEach( ( template ) => {
				text = text.replace( new RegExp( '\\{\\{' + template + '\\s*\\|?(.*?)\\}\\}\\n?', 'gi' ), '' );
			} );

			// Add to the list of comments to remove
			commentsToRemove.push(
				'Enter template purpose and instructions here.',
				'Enter the content and\\/or code of the template here.',
				'EDIT BELOW THIS LINE',
				'Metadata: see \\[\\[Wikipedia:Persondata\\]\\].',
				'See http://en.wikipedia.org/wiki/Wikipedia:Footnotes on how to create references using\\<ref\\>\\<\\/ref\\> tags, these references will then appear here automatically',
				'(After listing your sources please cite them using inline citations and place them after the information they cite.|Inline citations added to your article will automatically display here.) ' +
					'(Please see|See) ((https?://)?en.wikipedia.org/wiki/(Wikipedia|WP):REFB|\\[\\[Wikipedia:REFB\\]\\]) for instructions on how to add citations.',
				'Important, do not remove this line before (template|article) has been created.',
				'Important, do not remove anything above this line before (template|article) has been created.',
				'Do not remove this line!'
			);
		} else {
			// We want to disable categories, except categories inside of the template {{Draft categories}}, by adding a colon to the beginning of the wikilink.
			// Replace {{Draft categories}} with a placeholder.
			const protectedDraftCategories = [];
			text = text.replace( /\{\{(?:Draft categories|Draftcat)\b[\s\S]*?\}\}(?:\r?\n)?/gi, ( match ) => {
				const hasTrailingNewline = /\r?\n$/.test( match ),
					hasInternalNewline = /\r?\n/.test( hasTrailingNewline ? match.slice( 0, -1 ) : match ),
					hasCategoryWithSpaces = /\[\[:?Category:[^\]\r\n]*\s+[^\]\r\n]*\]\]/i.test( match );

				if ( !( hasTrailingNewline || hasInternalNewline || hasCategoryWithSpaces ) ) {
					return match;
				}

				const placeholder = '__AFCH_DRAFT_CATS_' + protectedDraftCategories.length + '__';
				protectedDraftCategories.push( match );
				return placeholder;
			} );
			// Disable categories by adding a colon to the beginning of the wikilink.
			text = text.replace( /\[\[Category:/gi, '[[:Category:' );
			// Replace the placeholder with the original wikicode.
			protectedDraftCategories.forEach( ( draftCategories, index ) => {
				text = text.replace( '__AFCH_DRAFT_CATS_' + index + '__', draftCategories );
			} );
		}

		// Remove empty section at the end (caused by "Resubmit" button on "declined" template)
		// Section may have categories after it - keep them there
		text = AFCH.removeEmptySectionAtEnd( text );

		// Assemble a master regexp and remove all now-unneeded comments (commentsToRemove)
		const commentRegex = new RegExp( '<!-{2,}\\s*(' + commentsToRemove.join( '|' ) + ')\\s*-{2,}>', 'gi' );
		text = text.replace( commentRegex, '' );

		// Remove initial request artifact
		text = text.replace( /== Request review at \[\[WP:AFC\]\] ==/gi, '' );

		// Remove sandbox templates
		text = text.replace( /\{\{(userspacedraft|userspace draft|user sandbox|Please leave this line alone \(sandbox heading\))(?:\{\{[^{}]*\}\}|[^}{])*\}\}/ig, '' );

		// Remove html comments (<!--) that surround categories
		text = text.replace( /<!--\s*((\[\[:{0,1}(Category:.*?)\]\]\s*)+)-->/gi, '$1' );

		// Remove spaces/commas between <ref> tags
		text = text.replace( /\s*(<\/\s*ref\s*>)\s*[,]*\s*(<\s*ref\s*(name\s*=|group\s*=)*\s*[^/]*>)[ \t]*$/gim, '$1$2' );

		// Remove whitespace before <ref> tags
		text = text.replace( /[ \t]*(<\s*ref\s*(name\s*=|group\s*=)*\s*.*[^/]+>)[ \t]*$/gim, '$1' );

		// Move punctuation before <ref> tags
		text = text.replace( /\s*((<\s*ref\s*(name\s*=|group\s*=)*\s*.*[/]{1}>)|(<\s*ref\s*(name\s*=|group\s*=)*\s*[^/]*>(?:<[^<>]*>|[^><])*<\/\s*ref\s*>))[ \t]*([.!?,;:])+$/gim, '$6$1' );

		// Replace {{http://example.com/foo}} with "* http://example.com/foo" (common newbie error)
		text = text.replace( /\n\{\{(http[s]?|ftp[s]?|irc|gopher|telnet):\/\/(.*?)\}\}/gi, '\n* $1://$3' );

		text = this.convertExternalLinksToWikilinks( text );

		this.text = text;
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Convert http://-style links to other wikipages to wikicode syntax
	 *
	 * @param {string} text
	 * @return {string}
	 */
	AFCH.Text.prototype.convertExternalLinksToWikilinks = function ( text ) {
		const linkRegex = /\[{1,2}(?:https?:)?\/\/(?:en.wikipedia.org\/wiki|enwp.org)\/([^\s|\][]+)(?:\s|\|)?((?:\[\[[^[\]]*\]\]|[^\][])*)\]{1,2}/ig;
		let linkMatch = linkRegex.exec( text ),
			title, displayTitle, newLink;

		while ( linkMatch ) {
			title = decodeURI( linkMatch[ 1 ] ).replace( /_/g, ' ' );
			displayTitle = decodeURI( linkMatch[ 2 ] ).replace( /_/g, ' ' );

			// Don't include the displayTitle if it is equal to the title
			if ( displayTitle && title !== displayTitle ) {
				newLink = '[[' + title + '|' + displayTitle + ']]';
			} else {
				newLink = '[[' + title + ']]';
			}

			text = text.replace( linkMatch[ 0 ], newLink );
			linkMatch = linkRegex.exec( text );
		}

		return text;
	};

	AFCH.Text.prototype.removeExcessNewlines = function () {
		// Replace 3+ newlines with just two
		this.text = this.text.replace( /(?:[\t ]*(?:\r?\n|\r)){3,}/ig, '\n\n' );
		// Remove all whitespace at the top of the article
		this.text = this.text.replace( /^\s*/, '' );
	};

	AFCH.Text.prototype.getAfcComments = function () {
		return this.text.match( /\{\{\s*afc comment[\s\S]+?\(UTC\)\}\}/gi );
	};

	AFCH.Text.prototype.removeAfcTemplates = function () {
		// FIXME: Awful regex to remove the old submission templates
		// This is bad. It works for most cases but has a hellish time
		// with some double nested templates or faux nested templates (for
		// example "{{hi|{ foo}}" -- note the extra bracket). Ideally Parsoid
		// would just return the raw template text as well (currently
		// working on a patch for that, actually).
		this.text = this.text.replace( new RegExp( '\\{\\{\\s*afc submission\\s*(?:\\||[^{{}}]*|{{.*?}})*?\\}\\}' +
			// Also remove the AFCH-generated warning message, since if necessary the script will add it again
			'( <!-- Do not remove this line! -->)?', 'gi' ), '' );

		this.text = AFCH.removeTemplates( this.text, [ 'afc comment' ] );

		// Remove horizontal rules that were added by AFCH after the comments
		this.text = this.text.replace( /^----+$/gm, '' );

		// Remove excess newlines created by AfC templates
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Removes old submission templates/comments and then adds new ones
	 * specified by `new`
	 *
	 * @param {string} newCode
	 * @return {string}
	 */
	AFCH.Text.prototype.updateAfcTemplates = function ( newCode ) {
		this.removeAfcTemplates();
		return this.prepend( newCode + '\n\n' );
	};

	AFCH.Text.prototype.updateCategories = function ( categories ) {
		// There's no "g" flag in categoryRegex, because we use it
		// to delete its matches in a loop. If it were global, then
		// it would internally keep track of lsatIndex - then given
		// two adjacent categories, only the first would get deleted
		let catIndex, match,
			text = this.text,
			categoryRegex = /\[\[:?Category:.*?\s*\]\]/i,
			newCategoryCode = '\n';

		// Create the wikicode block
		$.each( categories, ( _, category ) => {
			const trimmed = $.trim( category );
			if ( trimmed ) {
				newCategoryCode += '\n[[Category:' + trimmed + ']]';
			}
		} );

		match = categoryRegex.exec( text );

		// If there are no categories currently on the page,
		// just add the categories at the bottom
		if ( !match ) {
			text += newCategoryCode;
		// If there are categories on the page, remove them all, and
		// then add the new categories where the last category used to be
		} else {
			while ( match ) {
				catIndex = match.index;
				text = text.replace( match[ 0 ], '' );
				match = categoryRegex.exec( text );
			}

			text = text.substring( 0, catIndex ) + newCategoryCode + text.substring( catIndex );
		}

		this.text = text;
		return this.text;
	};

	/**
	 * Insert wikitext in MOS order.
	 *
	 * @param {string} insertWikitext
	 * @param {string} insertSection
	 * @return {string} Updated wikitext
	 */
	AFCH.Text.prototype.addWikitextToSection = function ( insertWikitext, insertSection ) {
		this.text = ( new AFCH.MOSOrderPositionFinder() ).insertAtSection( this.text, insertWikitext, insertSection );
		return this.text;
	};

	AFCH.Text.prototype.getActiveWikitext = function () {
		return this.text.replace( /<!--[\s\S]*?(?:-->|$)|<(nowiki|pre|source|syntaxhighlight)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:nowiki|pre|source|syntaxhighlight)\b[^>]*\/\s*>/gi, '' );
	};

	AFCH.Text.prototype.addUncategorizedTag = function () {
		this.text = AFCH.removeTemplates( this.text, [ 'Uncategorized' ] );
		const activeText = this.getActiveWikitext();
		const hasCategories = /\[\[\s*Category\s*:\s*[^\]|]+(?:\|[^\]]*)?\]\]/i.test( activeText );
		if ( hasCategories ) {
			return '';
		}
		this.text = AFCH.removeTemplates( this.text, [ 'Improve categories' ] );
		return this.addWikitextToSection(
			'{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}',
			'improveCategories'
		);
	};

	AFCH.Text.prototype.updateShortDescription = function ( existingShortDescription, newShortDescription ) {
		const shortDescTemplateExists = /\{\{[Ss]hort ?desc(ription)?\s*\|/.test( this.text );
		const shortDescExists = !!existingShortDescription;

		if ( newShortDescription ) {
			// 1. No shortdesc - insert the one provided by user
			if ( !shortDescExists ) {
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 2. Shortdesc exists from {{short description}} template - replace it
			} else if ( shortDescExists && shortDescTemplateExists ) {
				this.text = this.text.replace( /\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '' );
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 3. Shortdesc exists, but not generated by {{short description}}. If the user
			//  has changed the value, save the new value
			} else if ( shortDescExists && existingShortDescription !== newShortDescription ) {
				this.prepend( '{{Short description|' + newShortDescription + '}}\n' );

			// 4. Shortdesc exists, but not generated by {{short description}}, and user hasn't changed the value
			} else {
				// Do nothing
			}
		} else {
			// User emptied the shortdesc field (or didn't exist from before): remove any existing shortdesc.
			// This doesn't remove any shortdesc that is generated by other templates
			this.text = this.text.replace( /\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '' );
		}
	};

}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
