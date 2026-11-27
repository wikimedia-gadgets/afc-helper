/**
 * Tests for src/js/text.js
 */

/* eslint-env jest, node */
/* eslint-disable quotes */

describe( 'AFCH.Text.cleanUp - isAccept = true', () => {
	it( 'should clean up {{Draft categories|[[Category:Test]]}} when isAccept is true', () => {
		const wikicode = '{{Draft categories|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test]]';
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

	it( 'should clean up {{Draftcat|[[Category:Test]]}} when isAccept is true', () => {
		const wikicode = '{{Draftcat|[[Category:Test]]}}';
		const isAccept = true;
		const expectedOutput = '[[Category:Test]]';
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

	it( 'should handle empty input', () => {
		const wikicode = '';
		const isAccept = true;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( '' );
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
} );

describe( 'AFCH.Text.cleanUp - isAccept = false', () => {
	it( 'should not clean up {{Draft categories|[[Category:Test]]}} when isAccept is false', () => {
		const wikicode = '{{Draft categories|[[Category:Test]]}}';
		const isAccept = false;
		const expectedOutput = '{{Draft categories|[[:Category:Test]]}}';
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

	it( 'should not clean up {{Draftcat|[[Category:Test]]}} when isAccept is false', () => {
		const wikicode = '{{Draftcat|[[Category:Test]]}}';
		const isAccept = false;
		const expectedOutput = '{{Draftcat|[[:Category:Test]]}}';
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

	it( 'should handle {{Draft categories}} - one line', () => {
		const wikicode =
`{{Draft categories|[[Category:Jurassic Park characters]]}}
`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|[[Category:Jurassic Park characters]]}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - multiple lines 1', () => {
		const wikicode =
`{{Draft categories|[[Category:Jurassic Park characters]]
[[Category:Fictional clones]]}}
`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|[[Category:Jurassic Park characters]]
[[Category:Fictional clones]]}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - multiple lines 2', () => {
		const wikicode =
`{{Draft categories|
[[Category:Jurassic Park characters]]
[[Category:Fictional clones]]}}
`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|
[[Category:Jurassic Park characters]]
[[Category:Fictional clones]]}}
`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - no trailing newline 1', () => {
		const wikicode =
`{{Draft categories|[[Category:Jurassic Park characters]]}}`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|[[Category:Jurassic Park characters]]}}`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - no trailing newline 2', () => {
		const wikicode =
`{{Draft categories|
[[Category:Jurassic Park characters]]
}}`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|
[[Category:Jurassic Park characters]]
}}`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - no trailing newline 3', () => {
		const wikicode =
`{{Draft categories|
[[Category:Jurassic Park characters]]
[[Category:Jurassic Park characters 2]]
}}`;
		const isAccept = false;
		const expectedOutput =
`{{Draft categories|
[[Category:Jurassic Park characters]]
[[Category:Jurassic Park characters 2]]
}}`;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'should handle {{Draft categories}} - multiple {{Draft categories}}', () => {
		const wikicode =
`[[Category:Test1]]

{{Draft categories|
[[Category:Adam]]
[[Category:Bob]]
}}

[[Category:Test2]]

{{Draft categories|
[[Category:Claire]]
[[Category:David]]
}}

[[Category:Test3]]
`;
		const isAccept = false;
		const expectedOutput =
`[[:Category:Test1]]

{{Draft categories|
[[Category:Adam]]
[[Category:Bob]]
}}

[[:Category:Test2]]

{{Draft categories|
[[Category:Claire]]
[[Category:David]]
}}

[[:Category:Test3]]
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

	it( 'should not duplicate AfC comments with a reply inside the template when updating', () => {
		const comment = '{{AfC comment|1=Reviewer comment ~~~~\nResponse: I disagree.}}',
			output = ( new AFCH.Text( comment ) ).updateAfcTemplates( comment );
		expect( output.match( /\{\{\s*afc comment/gi ) ).toHaveLength( 1 );
	} );

	it( 'should remove AfC comments with additional parameters', () => {
		const wikicode = '{{AfC comment|1=Reviewer comment 12:00, 1 January 2024 (UTC)|2=Author reply}}';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates();
		expect( output ).toBe( '' );
	} );

	it( 'should remove {{AfC submission/draft}} templates', () => {
		const wikicode = '{{AfC submission/draft}}';
		const expectedOutput = '';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates( wikicode );
		expect( output ).toBe( expectedOutput );
	} );
} );
