// <nowiki>
/**
 * Utilities to help user scripts properly follow English Wikipedia's MOS:ORDER. Most of the methods need wikitext and a specific MOS:ORDER section as parameters, then output something useful related to MOS:ORDER.
 *
 * Location of main file:
 *    - https://github.com/NovemLinguae/UserScripts/blob/master/SpeciesHelper/modules/MOSOrderPositionFinder.js
 * Known locations of forks (to update when the main file gets updated):
 *    - PageTriage
 *    - AFC Helper Script
 *
 * @author Novem Linguae <noveminguae@gmail.com>
 */
AFCH.MOSOrderPositionFinder = class MOSOrderPositionFinder {

	/**
	 * Determines whether the given wikitext has the specified MOS:ORDER section
	 *
	 * @param {string} wikicode
	 * @param {string} section One of: top, shortDescription, displayTitle, hatnotes, featured, deletionAndProtection, maintenanceTags, engvar, infoboxes, languageScriptNeeded, sidebars, lead, tableOfContents, body, worksOrPublications, seeAlso, notesAndReferences, furtherReading, externalLinks, successionAndGeographyBoxes, navboxes, portalBar, taxonBar, authorityControl, geographicalCoordinates, defaultSort, categories, improveCategories, stubTemplates, bottom
	 * @return {boolean} whether the section is present
	 */
	hasSection( wikicode, section ) {
		this.wikitext = wikicode;
		this._calculate();
		return this._getSectionStartPosition( section ) !== -1;
	}

	/**
	 * Returns the numerical position of an MOS:ORDER section in wikitext
	 *
	 * @param {string} wikicode
	 * @param {string} section One of: top, shortDescription, displayTitle, hatnotes, featured, deletionAndProtection, maintenanceTags, engvar, infoboxes, languageScriptNeeded, sidebars, lead, tableOfContents, body, worksOrPublications, seeAlso, notesAndReferences, furtherReading, externalLinks, successionAndGeographyBoxes, navboxes, portalBar, taxonBar, authorityControl, geographicalCoordinates, defaultSort, categories, improveCategories, stubTemplates, bottom
	 * @return {number} sectionPosition: -1 if no section, integer if section. Counting starts at 0.
	 */
	getSectionPosition( wikicode, section ) {
		this.wikitext = wikicode;
		this._calculate();
		let position = this._getSectionStartPosition( section );
		if ( position === -1 ) {
			position = this._getPositionOfClosestSection( section );
		}
		return position;
	}

	/**
	 * Insert a string at the specified section in the wikitext. If section is absent, will guess where the section should go. Do not add whitespace, it will be computed for you.
	 *
	 * @param {string} wikicode
	 * @param {string} needle The string to insert
	 * @param {string} section One of: top, shortDescription, displayTitle, hatnotes, featured, deletionAndProtection, maintenanceTags, engvar, infoboxes, languageScriptNeeded, sidebars, lead, tableOfContents, body, worksOrPublications, seeAlso, notesAndReferences, furtherReading, externalLinks, successionAndGeographyBoxes, navboxes, portalBar, taxonBar, authorityControl, geographicalCoordinates, defaultSort, categories, improveCategories, stubTemplates, bottom
	 * @return {string} wikitext Transformed wikitext, containing the inserted string
	 */
	insertAtSection( wikicode, needle, section ) {
		this.wikitext = wikicode;

		// fix more than two enters in a row
		// this.wikitext = this.wikitext.replace(/\n{3,}/g, '\n\n');

		this._calculate();

		let position = this._getSectionStartPosition( section );
		if ( typeof position === 'undefined' ) {
			throw new Error( 'MOSOrderPositionFinder: invalid section supplied to function insertAtSection()' );
		}
		let hadToCreateNewSection = false;
		if ( position === -1 ) {
			position = this._getPositionOfClosestSection( section );
			hadToCreateNewSection = true;
		}

		let topHalf = this.wikitext.slice( 0, position );
		let bottomHalf = this.wikitext.slice( position );

		// TODO: these are band aid fixes, they need a rewrite. should probably add the ideal # of blank lines beneath each section to the list of sections, and then do a foreach loop through that
		// if too much whitespace, reduce amount of whitespace
		topHalf = topHalf.replace( /\n{3,}$/, '\n\n' );
		bottomHalf = bottomHalf.replace( /^\n{3,}/, '\n\n' );

		if ( topHalf.endsWith( '\n\n' ) ) {
			// intentionally left blank
		} else if ( topHalf.endsWith( '\n' ) ) {
			topHalf += '\n';
		} else {
			topHalf += '\n\n';
		}

		if ( !bottomHalf.startsWith( '\n' ) ) {
			bottomHalf = '\n' + bottomHalf;
		}

		if ( hadToCreateNewSection && !bottomHalf.startsWith( '\n\n' ) ) {
			bottomHalf = '\n' + bottomHalf;
		}

		this.wikitext = topHalf + needle + bottomHalf;

		if ( section === 'shortDescription' ) {
			// if template beneath the insertion point, don't put a blank line between SD and other template
			this.wikitext = this.wikitext.replace( /(\{\{(?:Short description|Shortdesc|Shortdescription|Short desc)\|[^}]+\}\}\n)\n(\{\{)/i, '$1$2' );
		}

		this.wikitext = this.wikitext.trim() + '\n';
		return this.wikitext;
	}

	/**
	 * Returns all section positions. Useful for testing.
	 *
	 * @param {string} wikicode
	 * @return {Object} An object with section names as keys and their positions in the wikitext as values. 0 is the very beginning of the string. -1 means the section is not present.
	 */
	getAllSectionPositions( wikicode ) {
		this.wikitext = wikicode;
		this._calculate();
		return this.sectionStartPositions;
	}

	/**
	 * Returns all section positions that exist (that aren't -1). Useful for testing.
	 *
	 * @param {string} wikicode
	 * @return {Object} An object with section names as keys and their positions in the wikitext as values. 0 is the very beginning of the string.
	 */
	getAllExistingSectionPositions( wikicode ) {
		this.wikitext = wikicode;
		this._calculate();
		const sections = {};
		for ( const key in this.sectionStartPositions ) {
			if ( this.sectionStartPositions[ key ] !== -1 ) {
				sections[ key ] = this.sectionStartPositions[ key ];
			}
		}
		return sections;
	}

	_calculate() {
		this.sectionOrder = [
			'top',
			'shortDescription',
			'displayTitle',
			'hatnotes',
			'featured',
			'deletionAndProtection',
			'maintenanceTags',
			'engvar',
			'infoboxes',
			'languageScriptNeeded',
			'sidebars',
			'lead',
			'tableOfContents',
			'body',
			'worksOrPublications',
			'seeAlso',
			'notesAndReferences',
			'furtherReading',
			'externalLinks',
			'successionAndGeographyBoxes',
			'navboxes',
			'portalBar',
			'taxonBar',
			'authorityControl',
			'geographicalCoordinates',
			'defaultSort',
			'categories',
			'improveCategories',
			'stubTemplates',
			'bottom'
		];

		this.sectionStartPositions = {
			top: 0,
			shortDescription: -1,
			displayTitle: -1,
			hatnotes: -1,
			featured: -1,
			deletionAndProtection: -1,
			maintenanceTags: -1,
			engvar: -1,
			infoboxes: -1,
			languageScriptNeeded: -1,
			sidebars: -1,
			lead: -1,
			tableOfContents: -1,
			body: -1,
			worksOrPublications: -1,
			seeAlso: -1,
			notesAndReferences: -1,
			furtherReading: -1,
			externalLinks: -1,
			successionAndGeographyBoxes: -1,
			navboxes: -1,
			portalBar: -1,
			taxonBar: -1,
			authorityControl: -1,
			geographicalCoordinates: -1,
			defaultSort: -1,
			categories: -1,
			stubTemplates: -1,
			improveCategories: -1,
			bottom: this.wikitext.length
		};
		// </nowiki>

		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:Short_description&hidelinks=1&hidetrans=1
		this.sectionStartPositions.shortDescription = this._lookForTemplates( this.wikitext, [
			'Short description',
			'Shortdesc',
			'Shortdescription',
			'Short desc'
		] );

		this.sectionStartPositions.displayTitle = this._lookForTemplates( this.wikitext, [
			'DISPLAYTITLE',
			'Lowercase title',
			'Italic title'
		] );

		// https://en.wikipedia.org/wiki/Wikipedia:Hatnote
		this.sectionStartPositions.hatnotes = this._lookForTemplates( this.wikitext, [
			'About',
			'About other people',
			'About otherpeople',
			'About year',
			'About-confuse',
			'About-confused',
			'About-distinguish',
			'About-other people',
			'About-other-people',
			'About-otherpeople',
			'Alternateuses',
			'Bài cùng tên',
			'Bhutanese name',
			'Bhutanese Name',
			'Brazilian name',
			'British barrelled name',
			'Broader',
			'Broader2',
			'Bulgarian name',
			'Chinese name',
			'Chinese name 2',
			'Chinese name2',
			'Confuse',
			'Confused',
			'Confusion',
			'Dab link',
			'Dablink',
			'Dabnote',
			'Dinka name',
			'Disambig-acronym',
			'Distinguish',
			'Distinguish redirect',
			'Distinguish-about',
			'Distinguish-for',
			'Distinguish-redirect',
			'Eastern name order',
			'Efn Catalan name',
			'Efn Chinese name',
			'Efn chinese name',
			'Efn Korean name',
			'Efn Spanish name',
			'Ethiopian name',
			'Fam',
			'Family name explanation',
			'Family name footnote',
			'Family name hatnote',
			'Fijian name',
			'Fijian name hatnote',
			'Filipino name',
			'Fne',
			'Fnf',
			'Fnh',
			'FNH',
			'For',
			'FOR',
			'For introduction',
			'For LMST',
			'For other uses',
			'For the',
			'For-distinguish',
			'For1',
			'For2',
			'Forthe',
			'Given name footnote',
			'Given name hatnote',
			'Gnf',
			'Hat note',
			'Hatlink',
			'Hatn',
			'Hatnote',
			'HATNOTE',
			'Highway detail hatnote',
			'Hungarian name',
			'Icelandic name',
			'Indian name',
			'Indian patronymic',
			'Indonesian name',
			'Korean name 2',
			'Main LMST',
			'Malay name',
			'Malay name2',
			'Norse name',
			'Not to be confused',
			'Not to be confused with',
			'Nottobeconfusedwith',
			'NTBCW',
			'Ntbcw',
			'On Wikipedia',
			'On wikipedia',
			'Other',
			'Other hurricane uses',
			'Other hurricanes',
			'Other locations',
			'Other meanings',
			'Other people',
			'Other people 2',
			'Other people 5',
			'Other people2',
			'Other people5',
			'Other persons',
			'Other places',
			'Other places3',
			'Other ships',
			'Other stars by Bayer designation',
			'Other storms',
			'Other use',
			'Other uses',
			'Other uses of',
			'Other uses1',
			'Otherhurricaneuses',
			'Otherhurricaneuses2',
			'Othermeanings',
			'Otherpeople',
			'Otherpeople2',
			'Otherpeople3',
			'Otherpeople5',
			'Otherpersons',
			'Otherpersons2',
			'Otherplaces',
			'Otherplaces3',
			'Others',
			'Otherships',
			'Otherships2',
			'Otheruse',
			'OtherUses',
			'Otheruses',
			'Otheruses-word',
			'Otheruses1',
			'Otheruses3',
			'Otheruses4',
			'Otherusesof',
			'Othervalues',
			'Ou',
			'Pakistani name',
			'Patronymic name',
			'Patronymic names',
			'Philippine name',
			'Portuguese name',
			'Rdf',
			'RDR',
			'Rdr',
			'Redir',
			'Redir-dist',
			'Redir-distinguish',
			'Redir-for',
			'Redir-multi',
			'Redir-several',
			'Redir2',
			'Redirect',
			'REDIRECT',
			'Redirect distinguish',
			'Redirect distinguish for',
			'Redirect for',
			'Redirect hatnote',
			'Redirect multi',
			'Redirect refer',
			'Redirect several',
			'Redirect-2',
			'Redirect-acronym',
			'Redirect-confuse',
			'Redirect-confuse2',
			'Redirect-confuse6',
			'Redirect-confused',
			'Redirect-confused2',
			'Redirect-confused6',
			'Redirect-dist',
			'Redirect-distinguish',
			'Redirect-distinguish-for',
			'Redirect-distinguish-text',
			'Redirect-distinguish2',
			'Redirect-distinguish6',
			'Redirect-for',
			'Redirect-multi',
			'Redirect-multiple',
			'Redirect-several',
			'Redirect-synonym',
			'Redirect1',
			'Redirect2',
			'Redirect3',
			'Redirect8',
			'Redirects',
			'Redirects here',
			'Rellink',
			'See dab',
			'See intro',
			'See Intro',
			'See introduction',
			'See Wiktionary',
			'See wiktionary',
			'See wt',
			'Seeintro',
			'SeeIntro',
			'Seewiktionary',
			'Self reference',
			'Several terms',
			'Similar names',
			'Spanish colonial name',
			'Spanish married name',
			'Surname hatnote',
			'Tchr',
			'Technical reasons',
			'Technical redirect',
			'Technical restrictions',
			'This',
			'This article',
			'This article is about',
			'Traditional Norwegian name',
			'Transcluded article',
			'Transcluded section',
			'Transcluded-section',
			'Transcluding',
			'Transcluding article',
			'Transcluding articles',
			'Transcluding section',
			'Transcludingarticle',
			'Transclusion notice',
			'Western name order',
			'Western Slavic name',
			'WikiIPA',
			'Wiktionary hatnote',
			'Year dab',
			'Другие значения',
			'Однофамильцы'
		] );

		this.sectionStartPositions.featured = this._lookForTemplates( this.wikitext, [
			'Featured list',
			'Featured article',
			'Good article'
		] );

		// https://en.wikipedia.org/wiki/Wikipedia:Criteria_for_speedy_deletion
		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:Proposed_deletion&hidelinks=1&hidetrans=1
		this.sectionStartPositions.deletionAndProtection = this._lookForTemplates( this.wikitext, [
			'Db-a1', // CSD
			'Db-a10',
			'Db-a11',
			'Db-a2',
			'Db-a3',
			'Db-a5',
			'Db-a7',
			'Db-a9',
			'Db-afc',
			'Db-album',
			'Db-animal',
			'Db-attack',
			'Db-attackorg',
			'Db-author',
			'Db-badfairuse',
			'Db-badfiletype',
			'Db-band',
			'Db-banned',
			'db-blankdraft',
			'Db-blanked',
			'Db-c1',
			'db-catempty',
			'Db-club',
			'Db-contact',
			'Db-copypaste',
			'Db-copyvio',
			'Db-disambig',
			'Db-discog',
			'Db-empty',
			'Db-emptyportal',
			'Db-error',
			'Db-event',
			'Db-f1',
			'Db-f10',
			'Db-f2',
			'Db-f3',
			'Db-f5',
			'Db-f7',
			'Db-f8',
			'Db-f9',
			'Db-filecopyvio',
			'Db-foreign',
			'Db-fpcfail',
			'Db-g1',
			'Db-g10',
			'Db-g11',
			'Db-g12',
			'Db-g13',
			'Db-g14',
			'Db-g2',
			'Db-g3',
			'Db-g4',
			'Db-g5',
			'Db-g6',
			'Db-g7',
			'Db-g8',
			'Db-hoax',
			'Db-imagepage',
			'Db-inc',
			'Db-invented',
			'Db-madeup',
			'Db-move',
			'Db-moved',
			'Db-multiple',
			'Db-negublp',
			'Db-nocontent',
			'Db-nocontext',
			'Db-nofile',
			'Db-noncom',
			'Db-nonsense',
			'Db-notwebhost',
			'Db-nouser',
			'Db-p1',
			'Db-p2',
			'Db-person',
			'Db-personal attack',
			'Db-promo',
			'Db-r2',
			'Db-r3',
			'Db-r4',
			'Db-redircom',
			'Db-redirnone',
			'Db-redirtypo',
			'Db-rediruser',
			'Db-redundantfile',
			'Db-repost',
			'Db-same',
			'Db-self',
			'Db-song',
			'Db-spam',
			'Db-spamuser',
			'Db-subpage',
			'Db-talk',
			'Db-templatecat',
			'Db-test',
			'Db-transwiki',
			'Db-u1',
			'Db-u2',
			'Db-u5',
			'Db-userreq',
			'Db-vandalism',
			'Db-web',
			'Db-xfd',
			'Proposed deletion', // PROD
			'Prod',
			'Proposed delete',
			'Proposal to delete',
			'Propose deletion',
			'Draft-prod',
			'Article for deletion', // AFD
			'Pp' // page protection padlocks, includes {{Pp}} and {{Pp-*}}
		] );

		// Source: Twinkle
		this.sectionStartPositions.maintenanceTags = this._lookForTemplates( this.wikitext, [
			'Multiple issues', // not from Twinkle
			'Cleanup',
			'Cleanup rewrite',
			'Copy edit',
			'Close paraphrasing',
			'Copypaste',
			'External links',
			'Non-free',
			'Cleanup reorganize',
			'Lead missing',
			'Lead rewrite',
			'Lead too long',
			'Lead too short',
			'Sections',
			'Too many sections',
			'Very long',
			'All plot',
			'Fiction',
			'In-universe',
			'Long plot',
			'No plot',
			'Notability',
			'Advert',
			'Cleanup tense',
			'Essay-like',
			'Fanpov',
			'Like resume',
			'Manual',
			'Cleanup-PR',
			'Over-quotation',
			'Prose',
			'Technical',
			'Tone',
			'Confusing',
			'Incomprehensible',
			'Unfocused',
			'Context',
			'Expert needed',
			'Overly detailed',
			'Undue weight',
			'Current',
			'Update',
			'Autobiography',
			'COI',
			'Disputed',
			'Hoax',
			'Globalize',
			'Over-coverage',
			'Paid contributions',
			'Peacock',
			'POV',
			'Recentism',
			'Refimprove',
			'Too few opinions',
			'Undisclosed paid',
			'Weasel',
			'BLP sources',
			'BLP unsourced',
			'More citations needed',
			'One source',
			'Original research',
			'Primary',
			'Primary sources',
			'Self-published',
			'Sources exist',
			'Third-party',
			'Unreferenced',
			'Unreliable sources',
			'Not English',
			'Rough translation',
			'Expand language',
			'Dead end',
			'Orphan',
			'Overlinked',
			'Underlinked',
			'Citation style',
			'Cleanup bare URLs',
			'More footnotes',
			'No footnotes',
			'Uncategorized',
			'History merge',
			'Merge',
			'Merge from',
			'Merge to',
			'GOCEinuse',
			'In use',
			'Under construction'
		] );

		// https://en.wikipedia.org/wiki/Template:Use_X_English
		this.sectionStartPositions.engvar = this._lookForTemplates( this.wikitext, [
			'Engvar', // engvar
			'EngvarA',
			'EngvarB',
			'Use American English',
			'Use Australian English',
			'Use Bangladeshi English',
			'Use British English',
			'Use Oxford spelling',
			'Use Canadian English',
			'Use Ghanaian English',
			'Use Hiberno-English',
			'Use Hong Kong English',
			'Use Indian English',
			'Use Jamaican English',
			'Use Kenyan English',
			'Use Liberian English',
			'Use New Zealand English',
			'Use Nigerian English',
			'Use Pakistani English',
			'Use Philippine English',
			'Use Singapore English',
			'Use South African English',
			'Use Trinidad and Tobago English',
			'Use dmy dates', // dates
			'Use mdy dates'
		] );

		this.sectionStartPositions.infoboxes = this._lookForTemplates( this.wikitext, [
			'Infobox',
			'Speciesbox',
			'Species box',
			'Automatic taxobox',
			'Taxobox',
			'Subspeciesbox',
			'Infraspeciesbox',
			'Hybridbox',
			'Virusbox'
		] );

		// https://en.wikipedia.org/wiki/Category:Language_maintenance_templates
		this.sectionStartPositions.languageScriptNeeded = this._lookForTemplates( this.wikitext, [
			'Arabic script needed',
			'Armenian script needed',
			'Berber script needed',
			'Burmese script needed',
			'Cherokee script needed',
			'Chinese script needed',
			'Chinese script needed inline',
			'Contains special characters',
			'Devanagari script needed',
			'Egyptian hieroglyphic script needed',
			'EngvarB',
			'Ge\'ez script needed',
			'Georgian script needed',
			'Greek script needed',
			'Hebrew script needed',
			'IPA-ga notice',
			'Japanese script needed',
			'Khmer script needed',
			'Korean script needed',
			'Lao script needed',
			'Needchunom',
			'Needhanja',
			'Needhiragana',
			'Needkanji',
			'Needs IPA',
			'Nepali script needed',
			'Persian script needed',
			'Pronunciation needed',
			'Romanization needed',
			'Samoan script needed',
			'Syriac script needed',
			'Tamil script needed',
			'Thai script needed',
			'Tibetan script needed',
			'Tok Pisin script needed',
			'User language subcategory',
			'User programming subcategory',
			'Verify spelling',
			'Vietnamese script needed',
			'Yiddish script needed'
		] );

		// No reliable way to search for these. Some end in sidebar, many don't. Example of ones that don't: [[Rohingya genocide]] -> {{Rohingya conflict}}, {{Genocide}}.
		// TODO: Will need to return the position of any template between top and first sentence that isn't in one of the lists above.
		this.sectionStartPositions.sidebars = -1;

		// Return first text that isn't whitespace, a template, or inside a template. This is the article's first sentence.
		this.sectionStartPositions.lead = this._getFirstNonTemplateNonWhitespace( this.wikitext );

		// https://en.wikipedia.org/wiki/Help:Magic_words#Behavior_switches
		this.sectionStartPositions.tableOfContents = this._lookForStrings( this.wikitext, [
			'__TOC__'
		] );

		this.sectionStartPositions.body = this._lookForRegEx( this.wikitext, /\n==/i );
		if ( this.sectionStartPositions.body !== -1 ) {
			this.sectionStartPositions.body++;
		}

		this.sectionStartPositions.worksOrPublications = this._lookForHeadings( this.wikitext, [
			'Works\\s*==',
			'Publications',
			'Discography',
			'Filmography'
		] );

		this.sectionStartPositions.seeAlso = this._lookForHeadings( this.wikitext, [
			'See also'
		] );

		this.sectionStartPositions.notesAndReferences = this._lookForHeadings( this.wikitext, [
			'Bibliography',
			'Citations',
			'Endnotes',
			'Footnotes',
			'Notes',
			'References',
			'Sources',
			'Works cited'
		] );

		this.sectionStartPositions.furtherReading = this._lookForHeadings( this.wikitext, [
			'Further reading'
		] );

		this.sectionStartPositions.externalLinks = this._lookForHeadings( this.wikitext, [
			'External links'
		] );

		// https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Succession_Box_Standardization/Templates
		// TODO: figure out what "geography boxes" are, add them
		this.sectionStartPositions.successionAndGeographyBoxes = this._lookForTemplates( this.wikitext, [
			'S-' // they all are of the format {{S-*}}
		] );

		// Hard to figure these out, unless they are contained in the {{Navbox}} wrapper
		// TODO: assume any templates in this area that aren't on other lists are navboxes
		// https://en.wikipedia.org/w/index.php?title=Special%3AWhatLinksHere&hidetrans=1&hidelinks=1&target=Template%3ANavbox&namespace=
		this.sectionStartPositions.navboxes = this._lookForTemplates( this.wikitext, [
			'Navbox',
			'Dynamic navigation box',
			'Navigation',
			'Hider hiding',
			'Horror navbox',
			'VG navigation',
			'CVG navigation',
			'TransNB',
			'Navtable'
		] );

		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:Portal_bar&hidetrans=1&hidelinks=1
		this.sectionStartPositions.portalBar = this._lookForTemplates( this.wikitext, [
			'Portal bar',
			'Prb'
		] );

		// https://en.wikipedia.org/w/index.php?title=Special%3AWhatLinksHere&hidetrans=1&hidelinks=1&target=Template%3ATaxonbar&namespace=
		this.sectionStartPositions.taxonBar = this._lookForTemplates( this.wikitext, [
			'Taxonbar',
			'Taxon-bar',
			'Taxobar',
			'TaxonIDs',
			'Taxon identifiers',
			'Taxon bar'
		] );

		// https://en.wikipedia.org/w/index.php?title=Special%3AWhatLinksHere&hidetrans=1&hidelinks=1&target=Template%3AAuthority+control&namespace=
		this.sectionStartPositions.authorityControl = this._lookForTemplates( this.wikitext, [
			'Authority control',
			'Normdaten',
			'Authoritycontrol',
			'External identifiers',
			'Autorité',
			'Control de autoridades',
			'전거 통제',
			'Normativna kontrola'
		] );

		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:Coord&hidetrans=1&hidelinks=1
		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:Coord_missing&hidetrans=1&hidelinks=1
		// using _findStringNotInsideTemplate because {{Coord}} inside infobox doesn't count
		this.sectionStartPositions.geographicalCoordinates = this._findTemplateNotInsideTemplate( this.wikitext, [
			'Coord', // coord
			'Coor',
			'Location',
			'Geocoord',
			'Geobox coor',
			'Co-ord',
			'Coord missing', // coord missing
			'No geolocation',
			'Missing coord',
			'Coords missing',
			'Locate me',
			'Needs coordinates'
		] );

		// https://en.wikipedia.org/w/index.php?title=Special:WhatLinksHere/Template:DEFAULTSORT&hidetrans=1&hidelinks=1
		this.sectionStartPositions.defaultSort = this._lookForTemplates( this.wikitext, [
			'DEFAULTSORT',
			'Default sort',
			'SORTIERUNG'
		] );

		this.sectionStartPositions.categories = this._lookForRegEx( this.wikitext, /\[\[:?Category:/i );

		this.sectionStartPositions.stubTemplates = this._lookForRegEx( this.wikitext, /\{\{[^}]*-stub\}\}/i );

		this.sectionStartPositions.improveCategories = this._lookForTemplates( this.wikitext, [ 'Improve categories', 'Uncategorized' ] );

		// If the body is the same position as any of the appendices, set body to -1, since there isn't really a body, just appendices.
		const appendices = [
			this.sectionStartPositions.worksOrPublications,
			this.sectionStartPositions.seeAlso,
			this.sectionStartPositions.notesAndReferences,
			this.sectionStartPositions.furtherReading,
			this.sectionStartPositions.externalLinks
		];
		if ( this.sectionStartPositions.body !== -1 && appendices.includes( this.sectionStartPositions.body ) ) {
			this.sectionStartPositions.body = -1;
		}

		if ( this.debug ) {
			for ( const section of this.sectionOrder ) {
				const position = this._getSectionStartPosition( section );
				const chunkPreview = this.wikitext.slice( position, position + 50 );
				console.log( `${ section }: ${ position }: ${ chunkPreview }` );
			}
		}
	}

	// To find the lead, look for the first non-template, non-whitespace, non-comment.
	_getFirstNonTemplateNonWhitespace( wikicode ) {
		const length = wikicode.length;
		let nesting = 0;
		for ( let i = 0; i < length; i++ ) {
			const chunk = wikicode.slice( i );
			if ( chunk.startsWith( '{{' ) || chunk.startsWith( '<!--' ) ) {
				nesting++;
			} else if ( chunk.startsWith( '}}' ) || chunk.startsWith( '->' ) ) { // chunks in this conditional must only be 2 characters wide
				nesting--;
				i++; // skip 2nd }
			} else if ( nesting === 0 && !chunk.match( /^\s/ ) ) {
				return i;
			}
		}
		return -1;
	}

	_findTemplateNotInsideTemplate( wikicode, arrayOfStrings ) {
		const length = wikicode.length;
		for ( const string of arrayOfStrings ) {
			let nesting = 0;
			for ( let i = 0; i < length; i++ ) {
				const chunk = wikicode.slice( i, i + 20 );
				const match = chunk.match( new RegExp( '^\\{\\{' + string, 'i' ) );
				if ( nesting === 0 && match ) {
					return i;
				} else if ( chunk.startsWith( '{{' ) ) {
					nesting++;
				} else if ( chunk.startsWith( '}}' ) ) {
					nesting--;
					i++; // skip 2nd }
				}
			}
		}
		return -1;
	}

	// Template names are not RegEx escaped.
	_lookForTemplates( haystack, arrayOfTemplateNames ) {
		let regExString = '\\{\\{(?:';
		for ( let name of arrayOfTemplateNames ) {
			// space or underscore, same thing
			name = name.replace( '_', ' ' );
			name = name.replace( ' ', '[ _]' );
			regExString += name + '|';
		}
		regExString = regExString.slice( 0, -1 ); // delete last character |
		regExString += ')(?![ -\\|]section)'; // don't match section maintenance tags, e.g. {{More citations needed section}} and {{More citations needed|section}}
		const matches = haystack.match( new RegExp( regExString, 'i' ) );
		return matches ? matches.index : -1;
	}

	// Heading names are not RegEx escaped.
	_lookForHeadings( haystack, arrayOfHeadingNames ) {
		let regExString = '={2,}\\s*(?:';
		for ( const name of arrayOfHeadingNames ) {
			regExString += name + '|';
		}
		regExString = regExString.slice( 0, -1 ); // delete last character |
		regExString += ')';
		const matches = haystack.match( new RegExp( regExString, 'i' ) );
		return matches ? matches.index : -1;
	}

	_lookForStrings( haystack, arrayOfRegExStrings ) {
		let regExString = '(?:';
		for ( const name of arrayOfRegExStrings ) {
			regExString += name + '|';
		}
		regExString = regExString.slice( 0, -1 ); // delete last character |
		regExString += ')';
		const matches = haystack.match( new RegExp( regExString, 'i' ) );
		return matches ? matches.index : -1;
	}

	_lookForRegEx( haystack, regEx ) {
		const matches = haystack.match( regEx );
		return matches ? matches.index : -1;
	}

	_getSectionStartPosition( section ) {
		const validSection = section in this.sectionStartPositions;
		if ( !validSection ) {
			throw new Error( 'MOSOrderPositionFinder: Invalid section name.' );
		}
		return this.sectionStartPositions[ section ];
	}

	// https://stackoverflow.com/a/13109786/3480193
	_arraySearch( arr, val ) {
		for ( let i = 0; i < arr.length; i++ ) {
			if ( arr[ i ] === val ) {
				return i;
			}
		}
		return false;
	}

	_getPositionOfClosestSection( section ) {
		const sectionKey = this._arraySearch( this.sectionOrder, section );

		// scan until you find a section that is not -1
		// can scan in either direction. I chose to scan down.
		for ( let i = sectionKey; i < this.sectionOrder.length; i++ ) {
			const sectionKey2 = this.sectionOrder[ i ];
			const sectionPosition = this.sectionStartPositions[ sectionKey2 ];
			if ( sectionPosition !== -1 ) {
				return sectionPosition;
			}
		}
	}
};
