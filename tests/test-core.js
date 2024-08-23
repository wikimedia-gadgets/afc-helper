/**
 * Tests for src/modules/core.js
 */

/* eslint-env jest */
/* eslint-disable indent, quotes */

require( './scaffold.js' );

resetToAFCApplicablePage();

requireScript( 'modules/core.js' );

// It's always good to start simple :)
describe( 'AFCH', function () {
	it( 'is an object', function () {
		expect( typeof AFCH ).toBe( 'object' );
	} );
} );

describe( 'AFCH.Page', function () {
	// FIXME...
} );

describe( 'AFCH.removeEmptySectionAtEnd', function () {
	it( 'no headings', function () {
		var wikicode = 'Test';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test' );
	} );

	it( 'one heading with body text', function () {
		var wikicode = 'Test\n\n==Test2==\nMore test text\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n' );
	} );

	it( 'two headings with body text', function () {
		var wikicode = 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( 'two headings with body text and with categories', function () {
		var wikicode = 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n[[Category:Test]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n== Test 3 ==\nYour text here.\n[[Category:Test]]\n' );
	} );

	it( '1 heading, 1 category, 1 heading, 1 empty heading', function () {
		var wikicode = 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( '1 heading, 2 categories, 1 heading, 1 empty heading', function () {
		var wikicode = 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\nMore test text\n\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( '1 empty heading, 2 categories, 1 heading, 1 empty heading', function () {
		var wikicode = 'Test\n\n==Test2==\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n\n== Test 4 ==\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n[[Category:Test]]\n[[Category:Test2]]\n\n== Test 3 ==\nYour text here.\n' );
	} );

	it( 'one heading without body text', function () {
		var wikicode = 'Test\n\n==Test2==\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n' );
	} );

	it( 'two headings without body text', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n' );
	} );

	it( 'two headings without body text and with one category', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n' );
	} );

	it( 'disabled category', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[:Category:Test]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[:Category:Test]]\n' );
	} );

	it( 'two headings without body text and with two categories #1', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n[[Category:Test2]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n[[Category:Test2]]\n' );
	} );

	it( 'two headings without body text and with two categories #2', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n\n[[Category:Test2]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n\n[[Category:Test2]]\n' );
	} );

	it( 'two headings without body text and with two categories #3', function () {
		var wikicode = 'Test\n\n==Test2==\n\n== Test 3 ==\n\n[[Category:Test]]\n\n [[Category:Test2]]\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n==Test2==\n\n[[Category:Test]]\n\n [[Category:Test2]]\n' );
	} );

	it( 'don\'t trim if no heading was deleted', function () {
		var wikicode = 'Test\n\n';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( 'Test\n\n' );
	} );

	// Catastrophic backtracking occurs if this test causes the test suite to get stuck for a long time
	it( 'should not cause regex catastrophic backtracking', function () {
		var wikicode = '{{AFC submission}}\n==A==\n                                                                                                             \nB';
		var output = AFCH.removeEmptySectionAtEnd( wikicode );
		expect( output ).toBe( '{{AFC submission}}\n==A==\n                                                                                                             \nB' );
	} );
} );

describe( 'AFCH.addTalkPageBanners', function () {
	it( 'talk page is blank', function () {
		var talkText = '';
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592485}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 1 );
	} );

	it( 'talk page has existing sections', function () {
		var talkText =
`== Hello ==
I have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)`;
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592485}}
}}

== Hello ==
I have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)`
		);
		expect( output.wikiProjectBannerCount ).toBe( 1 );
	} );

	it( 'talk page has existing templates, WikiProject banners on top', function () {
		var talkText =
`{{WikiProject Women}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}
`;
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{subst:WPAFC/article|oldid=592485}}
}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 2 );
	} );

	it( 'talk page has existing templates, WikiProject banners on bottom', function () {
		var talkText =
`{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}
{{WikiProject Women}}
`;
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{subst:WPAFC/article|oldid=592485}}
}}
{{translated page|ar|بحيرة كناو|version=|small=no|insertversion=|section=}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 2 );
	} );

	it( '|class= is removed from existing banners', function () {
		var talkText =
`{{WikiProject Women|class=B}}`;
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{subst:WPAFC/article|oldid=592485}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 2 );
	} );

	it( 'talk page has existing WikiProject banners', function () {
		var talkText =
`{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}`;
		var newAssessment = '';
		var revId = 592507;
		var isBiography = false;
		var newWikiProjects = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
{{subst:WPAFC/article|oldid=592507}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 4 );
	} );

	it( 'talk page has existing WikiProject banner shell and banners', function () {
		var talkText =
`{{WikiProject banner shell|
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`;
		var newAssessment = '';
		var revId = 592507;
		var isBiography = false;
		var newWikiProjects = [ 'WikiProject Somalia', 'WikiProject Women', 'WikiProject Women\'s sport' ];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
{{subst:WPAFC/article|oldid=592507}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 4 );
	} );

	it( 'talk page has existing WikiProject banner shell and banners, and reviewer adds more banners', function () {
		var talkText =
`{{WikiProject banner shell|
{{WikiProject Film}}
{{WikiProject Biography}}
{{WikiProject Women}}
{{WikiProject Television}}
}}`;
		var newAssessment = '';
		var revId = 592507;
		var isBiography = true;
		var newWikiProjects = [ 'WikiProject Romania' ];
		var lifeStatus = 'living';
		var subjectName = 'Lazarut, Raluca';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Film}}
{{WikiProject Women}}
{{WikiProject Television}}
{{subst:WPAFC/article|oldid=592507}}
{{WikiProject Biography|living=yes|listas=Lazarut, Raluca}}
{{WikiProject Romania}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 6 );
	} );

	// FIXME
	it.skip( 'remove an existing WikiProject', function () {
		var talkText =
`{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}`;
		var newAssessment = '';
		var revId = 592507;
		var isBiography = false;
		// user de-selected WikiProject Somalia
		var newWikiProjects = [ 'WikiProject Women', 'WikiProject Women\'s sport' ];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
{{subst:WPAFC/article|oldid=592507}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 4 );
	} );

	it( 'accept form is a biography with all fields filled in', function () {
		var talkText = '';
		var newAssessment = 'B';
		var revId = 592496;
		var isBiography = true;
		var newWikiProjects = [ 'WikiProject Africa', 'WikiProject Alabama' ];
		var lifeStatus = 'living';
		var subjectName = 'Jones, Bob';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|class=B|
{{subst:WPAFC/article|oldid=592496}}
{{WikiProject Biography|living=yes|listas=Jones, Bob}}
{{WikiProject Africa}}
{{WikiProject Alabama}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 4 );
	} );

	it( 'lifeStatus = dead', function () {
		var talkText = '';
		var newAssessment = '';
		var revId = 592496;
		var isBiography = true;
		var newWikiProjects = [];
		var lifeStatus = 'dead';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592496}}
{{WikiProject Biography|living=no|listas=}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 2 );
	} );

	it.skip( 'talk page has {{wikiproject biography}}, and user selects that it\'s not a biography, so should remove {{wikiproject biography}}', function () {
		var talkText =
`{{wikiproject biography|living=yes|class=B|listas=Jones, Bob}}
{{WikiProject Somalia}}`;
		var newAssessment = '';
		var revId = 592496;
		var isBiography = false;
		// FIXME: if isBiography = false, WikiProject Biography should not be making it into this array
		var newWikiProjects = [ 'WikiProject Biography', 'WikiProject Somalia' ];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{WikiProject Somalia}}
{{subst:WPAFC/article|oldid=592496}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 3 );
	} );

	it( 'user selects class = disambiguation', function () {
		var talkText = '';
		var newAssessment = 'disambig';
		var revId = 592681;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|class=disambig|
{{subst:WPAFC/article|oldid=592681}}
{{WikiProject Disambiguation}}
}}`
		);
		expect( output.wikiProjectBannerCount ).toBe( 2 );
	} );
} );

describe( 'AFCH.removeDuplicateBanners', function () {
	it( 'should handle empty array', function () {
		var banners = [];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [] );
	} );

	it( 'should handle array with 1 element', function () {
		var banners = [ '{{Test}}' ];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical elements', function () {
		var banners = [ '{{Test}}', '{{Test}}' ];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical elements, case insensitive', function () {
		var banners = [ '{{Test}}', '{{test}}' ];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test}}' ] );
	} );

	it( 'should handle array with 2 identical templates, but different parameters', function () {
		var banners = [ '{{Test|1=a}}', '{{Test|2=b}}' ];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [ '{{Test|1=a}}' ] );
	} );

	it( 'should handle a realistic example using WikiProject banners', function () {
		var banners = [
			'{{WikiProject Australia}}',
			'{{WikiProject Australia}}',
			'{{wikiproject australia}}',
			'{{WikiProject Australia|class=A}}',
			'{{WikiProject Ontario}}'
		];
		var output = AFCH.removeDuplicateBanners( banners );
		expect( output ).toEqual( [
			'{{WikiProject Australia}}',
			'{{WikiProject Ontario}}'
		] );
	} );
} );
