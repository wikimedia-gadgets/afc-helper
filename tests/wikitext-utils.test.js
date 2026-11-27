/**
 * Tests for src/js/wikitext-utils.js
 */

/* eslint-env jest */
/* eslint-disable indent, quotes */

describe( 'AFCH.addSignature', () => {
	it( 'adds a signature to unsigned text', () => {
		expect( AFCH.addSignature( 'Comment' ) ).toBe( 'Comment ~~~~' );
	} );

	it( 'trims leading and trailing whitespace', () => {
		expect( AFCH.addSignature( '  Comment  ' ) ).toBe( 'Comment ~~~~' );
	} );

	it( 'does not add another signature to signed text', () => {
		expect( AFCH.addSignature( '  Comment ~~~~  ' ) ).toBe( 'Comment ~~~~' );
	} );

	it( 'signs an empty string', () => {
		expect( AFCH.addSignature( '' ) ).toBe( ' ~~~~' );
	} );
} );

describe( 'AFCH.removeEmptySectionAtEnd', () => {
	it( 'no headings', () => {
		const wikicode = 'Test';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test' );
	} );

	it( 'one heading with body text', () => {
		const wikicode = 'Test\n\n==Test2==\nMore test text\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n' );
	} );

	it( 'two headings with body text', () => {
		const wikicode = 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( 'two headings with body text and with categories', () => {
		const wikicode = 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n[[Category:Test]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n[[Category:Test]]\n' );
	} );

	it( '1 heading, 1 category, 1 heading, 1 empty heading', () => {
		const wikicode = 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( '1 heading, 2 categories, 1 heading, 1 empty heading', () => {
		const wikicode = 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( '1 empty heading, 2 categories, 1 heading, 1 empty heading', () => {
		const wikicode = 'Test\n\n==Test2==\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( 'one heading without body text', () => {
		const wikicode = 'Test\n\n==Test2==\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n' );
	} );

	it( 'two headings without body text', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n' );
	} );

	it( 'two headings without body text and with one category', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n' );
	} );

	it( 'disabled category', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[:Category:Test]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[:Category:Test]]\n' );
	} );

	it( 'two headings without body text and with two categories #1', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n[[Category:Test2]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n[[Category:Test2]]\n' );
	} );

	it( 'two headings without body text and with two categories #2', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n\n[[Category:Test2]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n\n[[Category:Test2]]\n' );
	} );

	it( 'two headings without body text and with two categories #3', () => {
		const wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n\n [[Category:Test2]]\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n\n [[Category:Test2]]\n' );
	} );

	it( 'don\'t trim if no heading was deleted', () => {
		const wikicode = 'Test\n\n';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n' );
	} );

	// Catastrophic backtracking occurs if this test causes the test suite to get stuck for a long time
	it( 'should not cause regex catastrophic backtracking', () => {
		const wikicode = '{{AFC submission}}\n==A==\n                                                                                                             \nB';
		const output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( '{{AFC submission}}\n==A==\n                                                                                                             \nB' );
	} );
} );

describe( 'AFCH.addTalkPageBanners', () => {
	it.each( [
		{
			selected: [ 'WikiProject China', 'WikiProject Unlisted' ],
			removed: [ 'WikiProject Chemicals' ],
			expectedBanners: '{{WikiProject Unlisted|importance=low}}\n{{WikiProject China|importance=high}}'
		},
		{
			selected: [ 'WikiProject China' ],
			removed: [ 'WikiProject Chemicals', 'WikiProject Unlisted' ],
			expectedBanners: '{{WikiProject China|importance=high}}'
		}
	] )( 'removes deselected banners and preserves selected banners', ( { selected, removed, expectedBanners } ) => {
		const wikicode = `{{WikiProject banner shell|class=Stub|
{{WikiProject Chemicals | importance = low }}
{{WikiProject Unlisted|importance=low}}
}}
{{WikiProject China|importance=high}}`;
		const output = AFCH.addTalkPageBanners(
			wikicode, 'Stub', 123, false, selected, 'unknown', '', removed
		);
		expect( output ).toBe( `{{WikiProject banner shell |class=Stub |1=
{{subst:WPAFC/article |oldid=123}}
${ expectedBanners }
}}` );
	} );

	it( 'removes duplicate transclusions including nested parameters', () => {
		const wikicode = `{{WikiProject banner shell|1=
{{WikiProject Chemicals|importance={{importance|low}}}}
{{WikiProject Chemicals|x={{{parameter|default}}}}}
{{wikiproject_chemicals | importance=high}}
{{WikiProject Chemical engineering|importance=low}}
}}`;
		const output = AFCH.addTalkPageBanners(
			wikicode, '', 123, false, [ 'WikiProject Chemical engineering' ], 'unknown', '', [ 'WikiProject Chemicals' ]
		);
		expect( output ).toBe( `{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=123}}
{{WikiProject Chemical engineering|importance=low}}
}}` );
	} );

	it( 'treats different template names independently', () => {
		const wikicode = `{{WikiProject Chemicals|importance=low}}
{{WikiProject Chemicals redirect|importance=high}}`;
		const output = AFCH.addTalkPageBanners(
			wikicode, '', 123, false, [ 'WikiProject Chemicals redirect' ], 'unknown', '', [ 'WikiProject Chemicals' ]
		);
		expect( output ).toBe( `{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=123}}
{{WikiProject Chemicals redirect|importance=high}}
}}` );
	} );

	it( 'preserves a shell containing an unrecognized template', () => {
		const wikicode = `{{WikiProject banner shell|1=
{{WikiProject Chemicals}}
{{Other banner|importance=low}}
}}`;
		const output = AFCH.addTalkPageBanners(
			wikicode, '', 123, false, [], 'unknown', '', [ 'WikiProject Chemicals' ]
		);
		expect( output ).toBe( `{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=123}}
}}
{{WikiProject banner shell|1=
{{Other banner|importance=low}}
}}` );
	} );

	it( 'talk page is blank', () => {
		const wikicode = '';
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592485}}
}}`
		);
	} );

	it( 'talk page has existing sections', () => {
		const wikicode =
`== Hello ==
I have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)`;
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592485}}
}}

== Hello ==
I have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)`
		);
	} );

	it( 'talk page has existing templates, WikiProject banners on top', () => {
		const wikicode =
`{{WikiProject Women}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}
`;
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592485}}
{{WikiProject Women}}
}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}`
		);
	} );

	it( 'talk page has existing templates, WikiProject banners on bottom', () => {
		const wikicode =
`{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}
{{WikiProject Women}}
`;
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592485}}
{{WikiProject Women}}
}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}`
		);
	} );

	it( '|class= is removed from existing banners', () => {
		const wikicode =
`{{WikiProject Women|class=B}}`;
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592485}}
{{WikiProject Women}}
}}`
		);
	} );

	it( 'talk page has existing WikiProject banners', () => {
		const wikicode =
`{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}`;
		const newAssessment = '';
		const revId = 592507;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592507}}
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
	} );

	it( 'talk page has existing WikiProject banner shell and banners', () => {
		const wikicode =
`{{WikiProject banner shell|
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`;
		const newAssessment = '';
		const revId = 592507;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592507}}
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
	} );

	it( 'talk page has existing WikiProject banner shell and banners, and reviewer adds more banners', () => {
		const wikicode =
`{{WikiProject banner shell|
{{WikiProject Film}}
{{WikiProject Biography}}
{{WikiProject Women}}
{{WikiProject Television}}
}}`;
		const newAssessment = '';
		const revId = 592507;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [ 'WikiProject Romania' ];
		const lifeStatus = 'living';
		const subjectName = 'Lazarut, Raluca';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |blp=yes |listas=Lazarut, Raluca |1=
{{subst:WPAFC/article |oldid=592507}}
{{WikiProject Film}}
{{WikiProject Women}}
{{WikiProject Television}}
{{WikiProject Biography}}
{{WikiProject Romania}}
}}`
		);
	} );

	it( 'accept form is a biography with all fields filled in', () => {
		const wikicode = '';
		const newAssessment = 'B';
		const revId = 592496;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [ 'WikiProject Africa', 'WikiProject Alabama' ];
		const lifeStatus = 'living';
		const subjectName = 'Jones, Bob';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |class=B |blp=yes |listas=Jones, Bob |1=
{{subst:WPAFC/article |oldid=592496}}
{{WikiProject Biography}}
{{WikiProject Africa}}
{{WikiProject Alabama}}
}}`
		);
	} );

	it( 'lifeStatus = dead', () => {
		const wikicode = '';
		const newAssessment = '';
		const revId = 592496;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'dead';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |blp=no |1=
{{subst:WPAFC/article |oldid=592496}}
{{WikiProject Biography}}
}}`
		);
	} );

	it( 'user selects class = disambiguation', () => {
		const wikicode = '';
		const newAssessment = 'Disambig';
		const revId = 592681;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592681}}
{{WikiProject Disambiguation}}
}}`
		);
	} );

	it( 'don\'t write a |class= if the banner shell can auto detect it. Examples: Template, Portal, Disambig, etc.', () => {
		const wikicode = '';
		const newAssessment = 'Template';
		const revId = 592681;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592681}}
}}`
		);
	} );

	it( 'has {{OKA}} banner and puts it in the banner shell', () => {
		const wikicode =
`{{translated page|pl|Katowice Załęże|version=|small=no|insertversion=|section=}}{{OKA}}`;
		const newAssessment = '';
		const revId = 592681;
		const isBiography = false;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592681}}
{{OKA}}
}}
{{translated page|pl|Katowice Załęże|version=|small=no|insertversion=|section=}}`
		);
	} );

	it( 'line break between | and 1=', () => {
		const wikicode =
`{{WikiProject banner shell|
1=
{{WikiProject Chicago}}
}}`;
		const newAssessment = 'B';
		const revId = 592681;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |class=B |1=
{{subst:WPAFC/article |oldid=592681}}
{{WikiProject Chicago}}
{{WikiProject Biography}}
}}`
		);
	} );

	it( 'has task forces', () => {
		const wikicode =
`{{WikiProject banner shell|1=
{{WikiProject Chicago}}
{{WikiProject United States|KY=yes|KY-importance=|category=}}
{{WikiProject Former countries|AH-taskforce=yes|AH-taskforce-importance=}}
{{WikiProject Indiana Historical Society}}
{{WikiProject Architecture}}
{{WikiProject Jewish history}}
}}`;
		const newAssessment = 'B';
		const revId = 592681;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |class=B |1=
{{subst:WPAFC/article |oldid=592681}}
{{WikiProject Chicago}}
{{WikiProject United States|KY=yes|KY-importance=|category=}}
{{WikiProject Former countries|AH-taskforce=yes|AH-taskforce-importance=}}
{{WikiProject Indiana Historical Society}}
{{WikiProject Architecture}}
{{WikiProject Jewish history}}
{{WikiProject Biography}}
}}`
		);
	} );

	it( 'has |class={{{class}}}', () => {
		const wikicode =
`{{WikiProject banner shell|1=
{{WikiProject Chicago}}
{{WikiProject United States|KY=yes|KY-importance=|category=}}
{{WikiProject Former countries|class={{{class}}}|AH-taskforce=yes|AH-taskforce-importance=}}
{{WikiProject Indiana Historical Society}}
{{WikiProject Architecture}}
{{WikiProject Jewish history}}
}}`;
		const newAssessment = 'B';
		const revId = 592681;
		const isBiography = true;
		const wikiProjectsToAddOrKeep = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, wikiProjectsToAddOrKeep, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |class=B |1=
{{subst:WPAFC/article |oldid=592681}}
{{WikiProject Chicago}}
{{WikiProject United States|KY=yes|KY-importance=|category=}}
{{WikiProject Former countries|AH-taskforce=yes|AH-taskforce-importance=}}
{{WikiProject Indiana Historical Society}}
{{WikiProject Architecture}}
{{WikiProject Jewish history}}
{{WikiProject Biography}}
}}`
		);
	} );
} );

describe( 'AFCH.removeTemplates', () => {
	it( 'removes named templates from arbitrary wikitext', () => {
		const wikicode = '{{Short description|Example}}\nArticle text with {{Citation needed|date={{date}}}}.\n{{Other}}';
		expect( AFCH.removeTemplates( wikicode, [ 'Short description', 'Citation needed' ] ) )
			.toBe( 'Article text with .\n{{Other}}' );
	} );

	it( 'does not remove examples in comments or literal tags, or adjacent text', () => {
		const wikicode = `<!-- {{WikiProject Chemicals}} -->
<nowiki>{{WikiProject Chemicals}}</nowiki>
Before {{Template:WikiProject Chemicals|x={{nested}}}} after
{{WikiProject Chemical engineering}}
{{WikiProject Chemicals|importance=low}}
Text`;
		expect( AFCH.removeTemplates( wikicode, [ 'WikiProject Chemicals' ] ) ).toBe(
			`<!-- {{WikiProject Chemicals}} -->
<nowiki>{{WikiProject Chemicals}}</nowiki>
Before  after
{{WikiProject Chemical engineering}}
Text`
		);
	} );
} );

describe( 'AFCH.removeDuplicateBanners', () => {
	it( 'should handle empty array', () => {
		const banners = [];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [] );
	} );

	it( 'should handle array with 1 element', () => {
		const banners = [ '{{Test}}' ];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical elements', () => {
		const banners = [ '{{Test}}', '{{Test}}' ];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical elements, case insensitive', () => {
		const banners = [ '{{Test}}', '{{test}}' ];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical templates, but different parameters', () => {
		const banners = [ '{{Test|1=a}}', '{{Test|2=b}}' ];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test|1=a}}' ] );
	} );

	it( 'should handle a realistic example using WikiProject banners', () => {
		const banners = [
			'{{WikiProject Australia}}',
			'{{WikiProject Australia}}',
			'{{wikiproject australia}}',
			'{{WikiProject Australia|class=A}}',
			'{{WikiProject Ontario}}'
		];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [
			'{{WikiProject Australia}}',
			'{{WikiProject Ontario}}'
		] );
	} );

	it( 'should handle a space at the end of the template name', () => {
		const banners = [
			'{{WikiProject Military history |Indian-task-force=yes}}',
			'{{WikiProject Military history}}'
		];
		const output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [
			'{{WikiProject Military history |Indian-task-force=yes}}'
		] );
	} );
} );
