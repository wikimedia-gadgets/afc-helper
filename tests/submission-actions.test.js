/**
 * Tests for src/js/submission-actions.js
 */

/* eslint-env jest */

describe( 'AFCH.SubmissionActions', () => {
	describe( 'acceptance categorization', () => {
		let OriginalPage, originalApi, originalConsts, edits, apiGet;

		beforeEach( () => {
			OriginalPage = AFCH.Page;
			originalApi = AFCH.api;
			originalConsts = AFCH.consts;
			edits = jest.fn();
			apiGet = jest.fn();
			AFCH.api = { get: apiGet };
			AFCH.consts = { user: 'Reviewer' };
			AFCH.Page = function ( title ) {
				const page = new OriginalPage( title );
				page.edit = ( options ) => {
					edits( page.rawTitle, options );
					return $.Deferred().resolve();
				};
				page.getText = () => $.Deferred().resolve( '{{afc contrib|existing}}' );
				return page;
			};
			jest.spyOn( AFCH.actions, 'movePage' ).mockImplementation( ( from, to ) => $.Deferred().resolve( { to: to } ) );
			jest.spyOn( AFCH.actions, 'logAfc' ).mockImplementation( () => {} );
			jest.spyOn( AFCH, 'addTalkPageBanners' ).mockReturnValue( '' );
		} );

		afterEach( () => {
			jest.restoreAllMocks();
			AFCH.Page = OriginalPage;
			AFCH.api = originalApi;
			AFCH.consts = originalConsts;
		} );

		function accept( title, categories, wikicode = '{{Short description|Example}}\nLead.', options = {} ) {
			const actions = new AFCH.SubmissionActions( {
				$afch: $( '<div>' ),
				page: { rawTitle: 'Draft:Example', additionalData: {} },
				submission: { getSubmitter: () => $.Deferred().resolve( 'Author' ) },
				prepareForProcessing: jest.fn()
			} );
			actions.handleAccept( $.extend( {
				afchText: new AFCH.Text( wikicode ),
				newTitle: title,
				newCategories: categories,
				existingWikiProjects: [],
				newAssessment: 'Start'
			}, options ) );
		}

		it( 'does not place {{Uncategorized}} in articles with categories', () => {
			accept( 'Example', [ 'People' ] );
			const article = edits.mock.calls.find( ( call ) => call[ 0 ] === 'Example' )[ 1 ].contents;
			expect( article ).toContain( '[[Category:People]]' );
			expect( article ).not.toContain( '{{Uncategorized' );
		} );

		it( 'does place {{Uncategorized}} in articles without categories', () => {
			accept( 'Example', [] );
			const article = edits.mock.calls.find( ( call ) => call[ 0 ] === 'Example' )[ 1 ].contents;
			expect( article ).toContain( '{{Uncategorized' );
		} );

		it( 'removes existing uncategorized tags when biography categories are added', () => {
			const wikicode = '{{Uncategorized|date=November 2026}}\nLead.\n{{uncategorized|date=2025}}';
			accept( 'Example', [], wikicode, {
				isBiography: true,
				birthYear: '1901',
				lifeStatus: 'unknown',
				subjectName: ''
			} );
			const article = edits.mock.calls.find( ( call ) => call[ 0 ] === 'Example' )[ 1 ].contents;
			expect( article ).toContain( '[[Category:1901 births]]' );
			expect( article ).not.toMatch( /\{\{\s*uncategorized\b/i );
		} );

		it( 'replaces existing uncategorized tags when no categories are added', () => {
			const wikicode = '{{Uncategorized|date=November 2026}}\nLead.\n{{example-stub}}';
			accept( 'Example', [], wikicode );
			const article = edits.mock.calls.find( ( call ) => call[ 0 ] === 'Example' )[ 1 ].contents;
			expect( article ).toBe(
				'Lead.\n\n{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n\n{{example-stub}}\n'
			);
		} );

		it( 'places {{Uncategorized}} in the right spot according to MOS:ORDER', () => {
			const wikicode =
`{{AfC submission||u=Author}}
{{Short description|Example}}
{{Infobox person}}
Lead.

== References ==
{{reflist}}

{{DEFAULTSORT:Example}}
{{example-stub}}`;
			const expectedWikicode =
`{{Infobox person}}
Lead.

== References ==
{{reflist}}

{{DEFAULTSORT:Example}}

{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}

{{example-stub}}
`;
			accept( 'Example', [], wikicode );
			const article = edits.mock.calls.find( ( call ) => call[ 0 ] === 'Example' )[ 1 ].contents;
			expect( article ).toBe( expectedWikicode );
		} );
	} );

	it( 'updates the submitter and writes the submission text', () => {
		const page = { edit: jest.fn() },
			submission = {
				setStatus: jest.fn(),
				makeWikicode: jest.fn( () => 'updated template' )
			},
			text = {
				updateAfcTemplates: jest.fn(),
				cleanUp: jest.fn(),
				get: jest.fn( () => 'updated wikitext' )
			},
			actions = new AFCH.SubmissionActions( {
				$afch: $( '<div>' ),
				page: page,
				submission: submission,
				prepareForProcessing: jest.fn()
			} );

		actions.handleSubmit( {
			afchText: text,
			submitType: 'other',
			submitterName: 'Author'
		} );

		expect( submission.setStatus ).toHaveBeenCalledWith( '', { u: 'Author' } );
		expect( text.updateAfcTemplates ).toHaveBeenCalledWith( 'updated template' );
		expect( text.cleanUp ).toHaveBeenCalledTimes( 1 );
		expect( page.edit ).toHaveBeenCalledWith( {
			contents: 'updated wikitext',
			summary: 'Submitting'
		} );
	} );
} );
