/**
 * Tests for src/js/submission-text.js
 */

/* eslint-env jest, node */
/* eslint-disable quotes */

describe( 'AFCH.Text.addWikitextToSection', () => {
	it( 'inserts wikitext in the requested section', () => {
		const text = new AFCH.Text( '{{Short description|Example}}\n{{Infobox person}}\nLead.\n\n[[Category:People]]' );
		const result = text.addWikitextToSection( '{{Copy edit}}', 'maintenanceTags' );
		expect( result ).toBe(
			'{{Short description|Example}}\n\n{{Copy edit}}\n\n{{Infobox person}}\nLead.\n\n[[Category:People]]\n'
		);
		expect( text.get() ).toBe( result );
	} );

} );

describe( 'AFCH.Text.getActiveWikitext', () => {
	it( 'excludes comments and literal tags without modifying the original', () => {
		const wikicode = '<!-- skip -->\n<nowiki>skip</nowiki>\nLead.';
		const text = new AFCH.Text( wikicode );
		expect( text.getActiveWikitext() ).toBe( '\n\nLead.' );
		expect( text.get() ).toBe( wikicode );
	} );
} );

describe( 'AFCH.Text.addUncategorizedTag', () => {
	it( 'places uncategorized after defaultsort and before stubs', () => {
		const text = new AFCH.Text( '{{Short description|Example}}\n{{About|Example}}\n{{Infobox person}}\nLead.\n\n{{DEFAULTSORT:Example}}\n{{example-stub}}' );
		expect( text.addUncategorizedTag() ).toBe(
			'{{Short description|Example}}\n{{About|Example}}\n' +
			'{{Infobox person}}\nLead.\n\n{{DEFAULTSORT:Example}}\n\n' +
			'{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n\n{{example-stub}}\n'
		);
	} );

	it( 'replaces improve-categories with uncategorized', () => {
		const text = new AFCH.Text( 'Lead.\n\n{{Improve categories}}\n{{example-stub}}' );
		expect( text.addUncategorizedTag() ).toBe(
			'Lead.\n\n{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n' +
			'\n{{example-stub}}\n'
		);
	} );

	it( 'removes improve-categories tags with nested parameters without disturbing other templates', () => {
		const text = new AFCH.Text( 'Lead.\n\n{{Improve_categories|date=November 2020}}\n{{example-stub}}' );
		expect( text.addUncategorizedTag() ).toBe(
			'Lead.\n\n{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n\n{{example-stub}}\n'
		);
	} );

	it( 'removes an existing uncategorized tag when categories are present', () => {
		const text = new AFCH.Text( '{{Uncategorized|date=May 2020}}\nLead.\n[[Category:Example|Sort]]' );
		expect( text.addUncategorizedTag() ).toBe( '' );
		expect( text.get() ).toBe( 'Lead.\n[[Category:Example|Sort]]' );
	} );

	it( 'ignores commented and literal categories and tags', () => {
		const text = new AFCH.Text( '<!-- {{Uncategorized}} [[Category:Example]] -->\n<nowiki>[[Category:Example]]</nowiki>\nLead.' );
		const result = text.addUncategorizedTag();
		expect( result ).toContain( '{{Uncategorized|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}' );
	} );

	it( 'does not tag a categorized article', () => {
		const text = new AFCH.Text( 'Lead.\n[[Category:Example]]' );
		expect( text.addUncategorizedTag() ).toBe( '' );
		expect( text.get() ).toBe( 'Lead.\n[[Category:Example]]' );
	} );

	it( 'removes uncategorized tags while retaining examples in comments', () => {
		const text = new AFCH.Text( '{{Uncategorized|date={{date|2020}}}}\n<!-- {{Uncategorized}} -->\nLead.\n[[Category:Example]]' );
		expect( text.addUncategorizedTag() ).toBe( '' );
		expect( text.get() ).toBe( '<!-- {{Uncategorized}} -->\nLead.\n[[Category:Example]]' );
	} );

	it( 'adds the uncategorized tag to an uncategorized article', () => {
		const text = new AFCH.Text( 'Lead.' );
		const result = text.addUncategorizedTag();
		expect( result ).toContain( '{{Uncategorized|date=' );
	} );
} );

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
