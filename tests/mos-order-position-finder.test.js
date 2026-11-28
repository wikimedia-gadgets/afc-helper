/**
 * Tests for src/js/mos-order-position-finder.js
 */

/* eslint-env jest */

const MOSOrderPositionFinder = AFCH.MOSOrderPositionFinder;

describe( 'hasSection(wikicode, section)', () => {
	test( 'Uncategorized is recognized in both maintenance and improve-categories sections', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode = 'Lead\n\n{{Uncategorized}}\n{{example-stub}}';
		expect( mopf.hasSection( wikicode, 'maintenanceTags' ) ).toBe( true );
		expect( mopf.hasSection( wikicode, 'improveCategories' ) ).toBe( true );
	} );

	test( 'Section exists', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Navbox}}`;
		expect( mopf.hasSection( wikicode, 'shortDescription' ) ).toBe( true );
	} );

	test( 'Section does not exist', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`Lead

== First heading ==
Body`;
		expect( mopf.hasSection( wikicode, 'shortDescription' ) ).toBe( false );
	} );

	test( 'Invalid section name', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode = 'test';
		expect( () => {
			mopf.hasSection( wikicode, 'invalidSection' );
		} ).toThrowError( 'MOSOrderPositionFinder: Invalid section name.' );
	} );
} );

describe( 'getSectionPosition(wikicode, section)', () => {
	test( 'Valid section name', () => {
		const mopf = new MOSOrderPositionFinder();
		const section = 'notesAndReferences';
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Navbox}}`;
		const output = 60;
		expect( mopf.getSectionPosition( wikicode, section ) ).toEqual( output );
	} );

	test( 'Invalid section name', () => {
		const mopf = new MOSOrderPositionFinder();
		const section = 'references';
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Navbox}}`;
		expect( () => {
			mopf.getSectionPosition( wikicode, section );
		} ).toThrowError( 'MOSOrderPositionFinder: Invalid section name.' );
	} );
} );

describe( 'insertAtSection(wikicode, needle, section)', () => {
	test( 'Section does not exist yet', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body
`;
		const needle = '{{Taxonbar}}';
		const section = 'taxonBar';
		const output =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Taxonbar}}
`;
		expect( mopf.insertAtSection( wikicode, needle, section ) ).toBe( output );
	} );

	test( 'Section already exists', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}
{{Copy edit}}

Lead

== First heading ==
Body
`;
		const needle = '{{Close paraphrasing}}';
		const section = 'maintenanceTags';
		const output =
`{{Short description|test}}

{{Close paraphrasing}}
{{Copy edit}}

Lead

== First heading ==
Body
`;
		expect( mopf.insertAtSection( wikicode, needle, section ) ).toBe( output );
	} );

	test( 'Stubs only insert one blank line', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body
`;
		const needle = '{{Stub}}';
		const section = 'stubTemplates';
		const output =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Stub}}
`;
		expect( mopf.insertAtSection( wikicode, needle, section ) ).toBe( output );
	} );

	test( 'Invalid section name throws error', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode = 'Test';
		const needle = '{{test}}';
		const section = 'invalidSection';
		expect( () => {
			mopf.insertAtSection( wikicode, needle, section );
		} ).toThrowError( 'MOSOrderPositionFinder: Invalid section name.' );
	} );

	test( 'bug involving putting HTML comments in the wrong place in AFC drafts', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{AfC Comment}}<!-- do not remove this line-->

Lead
`;
		const needle = '{{Speciesbox}}';
		const section = 'infoboxes';
		const output =
`{{AfC Comment}}<!-- do not remove this line-->

{{Speciesbox}}

Lead
`;
		expect( mopf.insertAtSection( wikicode, needle, section ) ).toStrictEqual( output );
	} );
} );

describe( 'getAllSectionPositions(wikicode)', () => {
	test( 'returns all section positions including -1 values', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Navbox}}`;
		const output = {
			top: 0,
			shortDescription: 0,
			displayTitle: -1,
			hatnotes: -1,
			featured: -1,
			deletionAndProtection: -1,
			maintenanceTags: -1,
			engvar: -1,
			infoboxes: -1,
			languageScriptNeeded: -1,
			sidebars: -1,
			lead: 28,
			tableOfContents: -1,
			body: 34,
			worksOrPublications: -1,
			seeAlso: -1,
			notesAndReferences: -1,
			furtherReading: -1,
			externalLinks: -1,
			successionAndGeographyBoxes: -1,
			navboxes: 60,
			portalBar: -1,
			taxonBar: -1,
			authorityControl: -1,
			geographicalCoordinates: -1,
			defaultSort: -1,
			categories: -1,
			improveCategories: -1,
			stubTemplates: -1,
			bottom: 70
		};
		expect( mopf.getAllSectionPositions( wikicode ) ).toStrictEqual( output );
	} );
} );

describe( 'getAllExistingSectionPositions(wikicode)', () => {
	test( 'simple', () => {
		const mopf = new MOSOrderPositionFinder();
		const wikicode =
`{{Short description|test}}

Lead

== First heading ==
Body

{{Navbox}}`;
		const output = {
			top: 0,
			shortDescription: 0,
			lead: 28,
			body: 34,
			navboxes: 60,
			bottom: 70
		};
		expect( mopf.getAllExistingSectionPositions( wikicode ) ).toStrictEqual( output );
	} );
} );
