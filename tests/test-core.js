/**
 * Tests for src/modules/core.js
 */

/* eslint-env jest */
/* eslint-disable indent */

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
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592485}}
}}

`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 1 );
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
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592485}}
}}

== Hello ==
I have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">'''Novem Linguae'''</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 1 );
	} );

	// FIXME: unexpected \n between new banners and old banners. https://github.com/wikimedia-gadgets/afc-helper/issues/330
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
		var existingWikiProjects = [
			{
				displayName: 'Somalia',
				templateName: 'WikiProject Somalia',
				alreadyOnPage: true
			},
			{
				displayName: 'Women',
				templateName: 'WikiProject Women',
				alreadyOnPage: true
			},
			{
				displayName: 'Women\'s sport',
				templateName: 'WikiProject Women\'s sport',
				alreadyOnPage: true
			}
		];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592507}}

{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 4 );
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
		var existingWikiProjects = [
			{
				displayName: 'Somalia',
				templateName: 'WikiProject Somalia',
				alreadyOnPage: true
			},
			{
				displayName: 'Women',
				templateName: 'WikiProject Women',
				alreadyOnPage: true
			},
			{
				displayName: 'Women\'s sport',
				templateName: 'WikiProject Women\'s sport',
				alreadyOnPage: true
			}
		];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592507}}

{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 4 );
	} );

	// FIXME: the edit summary of 1 WikiProject banner removed is correct, but this doesn't actually remove the WikiProject banner from the talk page. https://github.com/wikimedia-gadgets/afc-helper/issues/329
	it( 'remove an existing WikiProject', function () {
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
		var existingWikiProjects = [
			{
				displayName: 'Somalia',
				templateName: 'WikiProject Somalia',
				alreadyOnPage: true
			},
			{
				displayName: 'Women',
				templateName: 'WikiProject Women',
				alreadyOnPage: true
			},
			{
				displayName: 'Women\'s sport',
				templateName: 'WikiProject Women\'s sport',
				alreadyOnPage: true
			}
		];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592507}}

{{WikiProject Women}}
{{WikiProject Women's sport}}
{{WikiProject Somalia}}
}}`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 1 );
		expect( output.bannerCount ).toBe( 4 );
	} );

	it( 'accept form is a biography with all fields filled in', function () {
		var talkText = '';
		var newAssessment = 'B';
		var revId = 592496;
		var isBiography = true;
		var newWikiProjects = [ 'WikiProject Africa', 'WikiProject Alabama' ];
		var lifeStatus = 'living';
		var subjectName = 'Jones, Bob';
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|class=B|
{{subst:WPAFC/article|oldid=592496}}
{{WikiProject Biography|living=yes|listas=Jones, Bob}}
{{WikiProject Africa}}
{{WikiProject Alabama}}
}}

`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 2 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 4 );
	} );

	it( 'lifeStatus = dead', function () {
		var talkText = '';
		var newAssessment = '';
		var revId = 592496;
		var isBiography = true;
		var newWikiProjects = [];
		var lifeStatus = 'dead';
		var subjectName = '';
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592496}}
{{WikiProject Biography|living=no|listas=}}
}}

`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 2 );
	} );

	// FIXME: is supposed to remove the {{wikiproject biography}} template and report 1 template removed, but does not. code outside of AFCH.addTalkPageBanners() is incorrectly calculating alreadyHasWPBio as false
	// FIXME: 2 extra line breaks in the output
	it( 'talk page has {{wikiproject biography}}, and user selects that it\'s not a biography, so should remove {{wikiproject biography}}', function () {
		var talkText =
`{{wikiproject biography|living=yes|class=B|listas=Jones, Bob}}
{{WikiProject Somalia}}`;
		var newAssessment = '';
		var revId = 592496;
		var isBiography = false;
		var newWikiProjects = [ 'WikiProject Biography', 'WikiProject Somalia' ];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var existingWikiProjects = [
			{
				displayName: 'Biography',
				templateName: 'WikiProject Biography',
				alreadyOnPage: true
			},
			{
				displayName: 'Somalia',
				templateName: 'WikiProject Somalia',
				alreadyOnPage: true
			}
		];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|
{{subst:WPAFC/article|oldid=592496}}

{{wikiproject biography|living=yes|listas=Jones, Bob}}
{{WikiProject Somalia}}
}}`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 3 );
	} );

	it( 'user selects class = disambiguation', function () {
		var talkText = '';
		var newAssessment = 'disambig';
		var revId = 592681;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName );
		expect( output.talkText ).toBe(
`{{WikiProject banner shell|class=disambig|
{{subst:WPAFC/article|oldid=592681}}
{{WikiProject Disambiguation}}
}}

`
		);
		expect( output.countOfWikiProjectsAdded ).toBe( 1 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
		expect( output.bannerCount ).toBe( 2 );
	} );
} );
