/**
 * Tests for src/modules/submission-model.js
 */

/* eslint-env jest, node */
/* eslint-disable quotes */

describe( 'AFCH.Submission.loadDataFromTemplates()', () => {
	it( 'Wikitext is Test', () => {
		const templates = [];
		const expectedOutput = [
			[],
			[]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( 'Wikitext is {{Random template}}', () => {
		const templates = [
			{ target: 'Random template', params: {} }
		];
		const expectedOutput = [
			[],
			[]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( 'Wikitext is {{AfC submission}}', () => {
		const templates = [
			{ target: 'AfC submission', params: {} }
		];
		const expectedOutput = [
			[
				{ params: {}, status: '', timestamp: '' }
			],
			[]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( 'Wikitext is {{AfC submission}} with some parameters', () => {
		const templates = [
			{
				target: 'AfC submission',
				params: {
					1: 'd',
					2: 'neo',
					u: 'Carljames19844',
					ns: '118',
					decliner: 'AlphaBetaGamma',
					declinets: '20251205094917',
					ts: '20251205094647'
				}
			}
		];
		const expectedOutput = [
			[
				{
					params: {
						2: "neo",
						decliner: "AlphaBetaGamma",
						declinets: "20251205094917",
						ns: "118",
						u: "Carljames19844"
					},
					status: "d",
					timestamp: "20251205094647"
				}
			],
			[]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( 'Wikitext is {{AfC submission/draft}}', () => {
		const templates = [
			{ target: 'AFC submission/draft', params: {} }
		];
		const expectedOutput = [
			[
				{ params: {}, status: '', timestamp: '' }
			],
			[]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( 'Wikitext is {{AFC comment}}', () => {
		const templates = [
			{ target: 'AFC comment', params: {} }
		];
		const expectedOutput = [
			[],
			[
				{ text: undefined, timestamp: 'unicorns' }
			]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );

	it( `Wikitext is {{AFC comment}} with some parameters`, () => {
		const templates = [
			{
				target: 'AFC comment',
				params: {
					1: `Test –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 19:59, 12 December 2025 (UTC)`
				}
			}
		];
		const expectedOutput = [
			[],
			[
				{
					timestamp: 20251212195900,
					text: `Test –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 19:59, 12 December 2025 (UTC)`
				}
			]
		];
		const output = ( new AFCH.Submission( new AFCH.Page( 'Test' ) ) ).loadDataFromTemplates( templates );
		expect( output ).toStrictEqual( expectedOutput );
	} );
} );

describe( 'AFCH.Submission.addNewComment()', () => {
	it( 'adds a signature when the comment is unsigned', () => {
		const submission = new AFCH.Submission( new AFCH.Page( 'Test' ) );

		submission.addNewComment( 'Test comment' );

		expect( submission.comments[ 0 ].text ).toBe( 'Test comment ~~~~' );
	} );
} );
