/**
 * Tests for src/modules/core.js
 */

/* eslint-env jest */
/* eslint-disable indent, quotes */

require( './scaffold.js' );

resetToAFCApplicablePage();

require( './../src/modules/core.js' );

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
	} );
} );

describe( 'AFCH.Page', () => {
	// FIXME...
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
	it( 'talk page is blank', () => {
		const wikicode = '';
		const newAssessment = '';
		const revId = 592485;
		const isBiography = false;
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [ 'WikiProject Romania' ];
		const lifeStatus = 'living';
		const subjectName = 'Lazarut, Raluca';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |living=yes |listas=Lazarut, Raluca |1=
{{subst:WPAFC/article |oldid=592507}}
{{WikiProject Film}}
{{WikiProject Women}}
{{WikiProject Television}}
{{WikiProject Biography}}
{{WikiProject Romania}}
}}`
		);
	} );

	// FIXME
	it.skip( 'remove an existing WikiProject', () => {
		const wikicode =
`{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}`;
		const newAssessment = '';
		const revId = 592507;
		const isBiography = false;
		// user de-selected WikiProject Somalia
		const newWikiProjects = [ 'WikiProject Women', 'WikiProject Women\'s sport' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592507}}
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
	} );

	it( 'accept form is a biography with all fields filled in', () => {
		const wikicode = '';
		const newAssessment = 'B';
		const revId = 592496;
		const isBiography = true;
		const newWikiProjects = [ 'WikiProject Africa', 'WikiProject Alabama' ];
		const lifeStatus = 'living';
		const subjectName = 'Jones, Bob';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |class=B |living=yes |listas=Jones, Bob |1=
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
		const newWikiProjects = [];
		const lifeStatus = 'dead';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |living=no |1=
{{subst:WPAFC/article |oldid=592496}}
{{WikiProject Biography}}
}}`
		);
	} );

	it.skip( 'talk page has {{wikiproject biography}}, and user selects that it\'s not a biography, so should remove {{wikiproject biography}}', () => {
		const wikicode =
`{{wikiproject biography|living=yes|class=B|listas=Jones, Bob}}
{{WikiProject Somalia}}`;
		const newAssessment = '';
		const revId = 592496;
		const isBiography = false;
		// FIXME: if isBiography = false, WikiProject Biography should not be making it into this array
		const newWikiProjects = [ 'WikiProject Biography', 'WikiProject Somalia' ];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592496}}
{{WikiProject Somalia}}
}}`
		);
	} );

	it( 'user selects class = disambiguation', () => {
		const wikicode = '';
		const newAssessment = 'Disambig';
		const revId = 592681;
		const isBiography = false;
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
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
		const newWikiProjects = [];
		const lifeStatus = 'unknown';
		const subjectName = '';
		const output = AFCH.addTalkPageBanners( wikicode, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output ).toBe(
`{{WikiProject banner shell |1=
{{subst:WPAFC/article |oldid=592681}}
{{OKA}}
}}
{{translated page|pl|Katowice Załęże|version=|small=no|insertversion=|section=}}`
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
