/**
 * Tests for src/modules/core.js
 */

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
	it( 'accept form is all default values, talk page is blank', function () {
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
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName, AFCH.removeFromArray, $.inArray, $.each );
		expect( output.talkText ).toBe( '{{subst:WPAFC/article|class=|oldid=592485}}\n\n' );
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
	} );

	it( 'accept form is all default values, talk page has existing sections', function () {
		var talkText = '== Hello ==\nI have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">\'\'\'Novem Linguae\'\'\'</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)';
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName, AFCH.removeFromArray, $.inArray, $.each );
		expect( output.talkText ).toBe( '{{subst:WPAFC/article|class=|oldid=592485}}\n\n== Hello ==\nI have a question. Can you help answer it? –[[User:Novem Linguae|<span style="color:blue">\'\'\'Novem Linguae\'\'\'</span>]] <small>([[User talk:Novem Linguae|talk]])</small> 20:22, 10 April 2024 (UTC)' );
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
	} );

	// TODO: unexpected \n between new banners and old banners
	it( 'accept form is all default values, talk page has existing WikiProject banners', function () {
		var talkText = '{{WikiProject Women}}\n{{WikiProject Women\'s sport}}\n{{WikiProject Somalia}}';
		var newAssessment = '';
		var revId = 592485;
		var isBiography = false;
		var newWikiProjects = [];
		var lifeStatus = 'unknown';
		var subjectName = '';
		var existingWikiProjects = [];
		var alreadyHasWPBio = false;
		var existingWPBioTemplateName = null;
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName, AFCH.removeFromArray, $.inArray, $.each );
		expect( output.talkText ).toBe( '{{subst:WPAFC/article|class=|oldid=592485}}\n\n{{WikiProject Women}}\n{{WikiProject Women\'s sport}}\n{{WikiProject Somalia}}' );
		expect( output.countOfWikiProjectsAdded ).toBe( 0 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
	} );

	// TODO: need a test that has non-default input for existingWikiProjects, alreadyHasWPBio, and existingWPBioTemplateName
	it( 'accept form is a biography with all fields filled in, talk page is blank', function () {
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
		var output = AFCH.addTalkPageBanners( talkText, newAssessment, revId, isBiography, newWikiProjects, lifeStatus, subjectName, existingWikiProjects, alreadyHasWPBio, existingWPBioTemplateName, AFCH.removeFromArray, $.inArray, $.each );
		expect( output.talkText ).toBe( '{{subst:WPAFC/article|class=B|oldid=592496}}\n{{WikiProject Biography|living=yes|class=B|listas=Jones, Bob}}\n{{WikiProject Africa|class=B}}\n{{WikiProject Alabama|class=B}}\n\n' );
		expect( output.countOfWikiProjectsAdded ).toBe( 2 );
		expect( output.countOfWikiProjectsRemoved ).toBe( 0 );
	} );
} );
