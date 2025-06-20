/**
 * Tests for src/modules/submission.js
 */

/* eslint-env jest */

require( './scaffold.js' );

resetToAFCApplicablePage();

require( './../src/modules/core.js' );
require( './../src/modules/submissions.js' );

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
