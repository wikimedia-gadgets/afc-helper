/**
 * Tests for src/modules/submission.js
 */

/* eslint-env jest */

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
	} );
} );

describe( 'AFCH.Text.cleanUp', () => {
	it( 'should handle empty input', () => {
		const wikicode = '';
		const isAccept = true;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( '' );
	} );

	it( 'should clean up {{Draft categories|[[Category:Test]]}} when isAccept is true', () => {
		const wikicode = '{{Draft categories|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test]]';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not clean up {{Draft categories|[[Category:Test]]}} when isAccept is false', () => {
		const wikicode = '{{Draft categories|[[Category:Test]]}}';
		const isAccept = false;
		const expectedOutput = '{{Draft categories|[[:Category:Test]]}}';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should clean up {{draft categories|[[Category:Test]]}} (case insensitive) when isAccept is true', () => {
		const wikicode = '{{draft categories|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test]]';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not clean up {{draft categories|[[Category:Test]]}} (case insensitive) when isAccept is false', () => {
		const wikicode = '{{draft categories|[[Category:Test]]}}';
		const isAccept = false;
		const expectedOutput = '{{draft categories|[[:Category:Test]]}}';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should clean up {{Draftcat|[[Category:Test]]}} when isAccept is true', () => {
		const wikicode = '{{Draftcat|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test]]';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not clean up {{Draftcat|[[Category:Test]]}} when isAccept is false', () => {
		const wikicode = '{{Draftcat|[[Category:Test]]}}';
		const isAccept = false;
		const expectedOutput = '{{Draftcat|[[:Category:Test]]}}';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should clean up multiple categories in {{Draft categories}} when isAccept is true', () => {
		const wikicode = '{{Draft categories|[[Category:Test1]] [[Category:Test2]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test1]] [[Category:Test2]]';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not clean up {{Draft categories}} without categories when isAccept is false', () => {
		const wikicode = '{{Draft categories}}';
		const isAccept = false;
		const expectedOutput = '{{Draft categories}}';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should clean up {{Draft categories}} with text outside the template when isAccept is true', () => {
		const wikicode = 'Some text {{Draft categories|[[Category:Test]]}} more text';
		const isAccept = true;
		const expectedOutput = 'Some text [[Category:Test]] more text';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not alter non-draft templates', () => {
		const wikicode = '{{NonDraft|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '{{NonDraft|[[Category:Test]]}}';
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove <!-- Important, do not remove this line... --> when accepting', () => {
		const wikicode =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const isAccept = true;
		const expectedOutput =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove <!-- Important, do not remove anything above this line... --> when accepting', () => {
		const wikicode =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove anything above this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const isAccept = true;
		const expectedOutput =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove <!-- Do not remove this line! --> when accepting', () => {
		const wikicode =
`{{AFC submission|||u=172.116.210.112|ns=118|ts=20210128174245}}
<!-- Do not remove this line! -->{{short description|Upcoming American supernatural horror film}}
`;
		const isAccept = true;
		const expectedOutput =
`{{AFC submission|||u=172.116.210.112|ns=118|ts=20210128174245}}
{{short description|Upcoming American supernatural horror film}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not remove <!-- Important, do not remove this line... --> when declining', () => {
		const wikicode =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const isAccept = false;
		const expectedOutput =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not remove <!-- Important, do not remove anything above this line... --> when declining', () => {
		const wikicode =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove anything above this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const isAccept = false;
		const expectedOutput =
`{{AfC submission|t||ts=20220716175214|u=Guillermind81|ns=118|demo=}}<!-- Important, do not remove anything above this line before article has been created. -->
{{short description|Astronomical treatise by Christiaan Huygens}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should not remove <!-- Do not remove this line! --> when declining', () => {
		const wikicode =
`{{AFC submission|||u=172.116.210.112|ns=118|ts=20210128174245}}
<!-- Do not remove this line! -->{{short description|Upcoming American supernatural horror film}}
`;
		const isAccept = false;
		const expectedOutput =
`{{AFC submission|||u=172.116.210.112|ns=118|ts=20210128174245}}
<!-- Do not remove this line! -->{{short description|Upcoming American supernatural horror film}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );
} );

describe( 'AFCH.Text.removeAfcTemplates', () => {
	it( 'should do nothing to normal text', () => {
		const wikicode = 'Test';
		const expectedOutput = 'Test';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates();
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove unsubmitted draft templates', () => {
		const wikicode = '{{AfC submission|t}}';
		const expectedOutput = '';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates();
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove declined draft templates', () => {
		const wikicode = '{{AFC submission|d|neo|u=Carljames19844|ns=118|decliner=AlphaBetaGamma|declinets=20251205094917|ts=20251205094647}}';
		const expectedOutput = '';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates();
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should remove {{AfC submission/draft}} templates', () => {
		const wikicode = '{{AfC submission/draft}}';
		const expectedOutput = '';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates( wikicode );
		expect( output ).toBe( expectedOutput );
	} );
} );

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
