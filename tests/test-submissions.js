/**
 * Tests for src/modules/submission.js
 */

/* eslint-env jest, node */
/* eslint-disable quotes */

const fs = require( 'fs' );
const path = require( 'path' );

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
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

	it( 'should remove {{AfC submission/draft}} templates', () => {
		const wikicode = '{{AfC submission/draft}}';
		const expectedOutput = '';
		const output = ( new AFCH.Text( wikicode ) ).removeAfcTemplates( wikicode );
		expect( output ).toBe( expectedOutput );
	} );
} );

describe( 'AFCH.Text.addBiographyCategoriesAndDefaultSort', () => {
	it( 'adds the L template with categories for a living person', () => {
		const wikicode = 'Some article text.';
		const expectedOutput = 'Some article text.\n{{subst:L|1=1990|2=LIVING|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1990', 'LIVING', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'adds the L template for someone who has died, with both years known', () => {
		const wikicode = 'Some article text.';
		const expectedOutput = 'Some article text.\n{{subst:L|1=1899|2=1986|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', '1986', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'does not add a duplicate category if the same one is already on the page', () => {
		// page already has 1899 births on it, template is about to add it again
		const wikicode = 'Some article text.\n[[Category:1899 births]]';
		const expectedOutput = 'Some article text.\n\n{{subst:L|1=1899|2=LIVING|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', 'LIVING', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'leaves the page alone if everything is already correct', () => {
		// nothing to fix here, DEFAULTSORT + categories already match what we'd add
		const wikicode = 'Some article text.\n{{DEFAULTSORT:Smith, John}}\n[[Category:1899 births]]\n[[Category:Living people]]';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', 'LIVING', 'Smith, John' );
		expect( output ).toBe( wikicode );
	} );

	it( 'removes the "year of birth missing" placeholder once a real birth year is given', () => {
		const wikicode = 'Some article text.\n[[Category:Year of birth missing]]';
		const expectedOutput = 'Some article text.\n\n{{subst:L|1=1899|2=LIVING|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', 'LIVING', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'removes the "year of death missing" placeholder once a real death year is given', () => {
		const wikicode = 'Some article text.\n[[Category:Year of death missing]]';
		const expectedOutput = 'Some article text.\n\n{{subst:L|1=1899|2=1986|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', '1986', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'swaps out an old wrong DEFAULTSORT for the one the reviewer typed', () => {
		// page has a typo'd sortkey, reviewer fixed it in the form
		const wikicode = 'Some article text.\n{{DEFAULTSORT:Smith, J.}}';
		const expectedOutput = 'Some article text.\n\n{{subst:L|1=1899|2=LIVING|3=Smith, John}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', 'LIVING', 'Smith, John' );
		expect( output ).toBe( expectedOutput );
	} );

	it( 'skips param 3 if DEFAULTSORT already matches what the reviewer typed', () => {
		const wikicode = 'Some article text.\n{{DEFAULTSORT:Smith, John}}';
		const expectedOutput = 'Some article text.\n{{DEFAULTSORT:Smith, John}}\n{{subst:L|1=1899|2=LIVING}}';
		const output = ( new AFCH.Text( wikicode ) ).addBiographyCategoriesAndDefaultSort( '1899', 'LIVING', 'Smith, John' );
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

describe( 'decline and reject notifications', () => {
	let originalSubmission, OriginalPage, originalFlag, originalHogan, originalChosen, originalSpinner,
		originalConsts, originalPrefs, originalPreferences, originalApi, editPage, getCategories;

	beforeEach( () => {
		originalSubmission = AFCH.Submission;
		OriginalPage = AFCH.Page;
		originalFlag = inUnitTestEnvironment;
		originalHogan = global.Hogan;
		originalChosen = $.fn.chosen;
		originalSpinner = $.createSpinner;
		originalConsts = AFCH.consts;
		originalPrefs = AFCH.prefs;
		originalPreferences = AFCH.preferences;
		originalApi = AFCH.api;
		inUnitTestEnvironment = undefined;
		global.Hogan = require( 'hogan.js' );
		$.fn.chosen = function () {
			return this;
		};
		$.createSpinner = () => $( '<div>' );

		document.body.innerHTML = '<div id="mw-content-text"></div>';
		AFCH.consts = { pagename: 'Draft:Example', user: 'Reviewer', baseurl: '' };
		AFCH.prefs = { autoOpen: false };
		AFCH.preferences = { initLink: jest.fn() };
		AFCH.api = { get: jest.fn() };
		editPage = jest.fn();
		getCategories = jest.fn( () => $.Deferred().resolve( [] ) );
		AFCH.Page = function ( title ) {
			const page = new OriginalPage( title );
			page.getText = () => $.Deferred().resolve( '{{AfC submission||u=Author}}' );
			page.getCategories = getCategories;
			page.exists = () => $.Deferred().resolve( true );
			page.edit = ( options ) => {
				editPage( page.rawTitle, options );
				return $.Deferred().resolve();
			};
			return page;
		};
		jest.spyOn( mw.util, 'addPortletLink' ).mockImplementation( () => $( '<a>' ).attr( 'id', 'afch-launch' ).appendTo( document.body )[ 0 ] );
		const getConfig = mw.config.get.bind( mw.config );
		jest.spyOn( mw.config, 'get' ).mockImplementation( ( key ) => {
			const values = {
				wgArticleId: 1,
				wgPageContentModel: 'wikitext',
				wgNamespaceNumber: 118,
				wgCurRevisionId: 1,
				wgPageName: 'Draft:Example'
			};
			return Object.prototype.hasOwnProperty.call( values, key ) ? values[ key ] : getConfig( key );
		} );

		jest.isolateModules( () => {
			require( '../src/modules/submissions.js' );
		} );

		jest.spyOn( AFCH.Submission.prototype, 'parse' ).mockImplementation( function () {
			this.templates = [ { status: '', timestamp: '20240101000000', params: { u: 'Author' } } ];
			this.sortAndParseInternalData();
			return $.Deferred().resolve( this );
		} );
		jest.spyOn( AFCH.Submission.prototype, 'getSubmitter' ).mockImplementation( () => $.Deferred().resolve( 'Author' ) );
		jest.spyOn( AFCH.userData, 'get' ).mockImplementation( ( key, fallback ) => fallback );
		jest.spyOn( AFCH.userData, 'set' ).mockImplementation( () => $.Deferred().resolve() );
		jest.spyOn( AFCH.actions, 'logAfc' ).mockImplementation( () => {} );
		jest.spyOn( AFCH.actions, 'logCSD' ).mockImplementation( () => {} );
		jest.spyOn( AFCH.status, 'init' ).mockImplementation( () => {} );
		AFCH.api.get.mockImplementation( ( params ) => {
			if ( params.revids ) {
				return $.Deferred().resolve( { query: { pages: [ { revisions: [ { timestamp: '2024-01-01T00:00:00Z' } ] } ] } } );
			}
			if ( params.rvstart ) {
				return $.Deferred().resolve( { query: { pages: [ {} ] } } );
			}
			return $.Deferred();
		} );
		jest.spyOn( $, 'ajax' ).mockImplementation( () => $.Deferred().resolve(
			fs.readFileSync( path.join( __dirname, '..', 'src', 'templates', 'tpl-submissions.html' ), 'utf8' )
		) );
	} );

	afterEach( () => {
		$( document ).off( 'ajaxStop' );
		jest.restoreAllMocks();
		AFCH.Submission = originalSubmission;
		AFCH.Page = OriginalPage;
		AFCH.consts = originalConsts;
		AFCH.prefs = originalPrefs;
		AFCH.preferences = originalPreferences;
		AFCH.api = originalApi;
		inUnitTestEnvironment = originalFlag;
		global.Hogan = originalHogan;
		$.fn.chosen = originalChosen;
		$.createSpinner = originalSpinner;
	} );

	async function waitFor( predicate ) {
		for ( let i = 0; i < 100; i++ ) {
			if ( predicate() ) {
				return;
			}
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 10 );
			} );
		}
		throw new Error( 'Timed out waiting for the review form' );
	}

	it.each( [
		[ 'decline', false ],
		[ 'decline', true ],
		[ 'reject', false ],
		[ 'reject', true ]
	] )( '%s with notify=%s respects the selected checkbox', async ( action, notify ) => {
		$( '#afch-launch' ).trigger( 'click' );
		await waitFor( () => $( '#afchDecline' ).length );
		$( '#afchDecline' ).trigger( 'click' );
		await waitFor( () => $( '#declineNotifyUser' ).length );

		$( '#declineReason' ).val( [ 'bio' ] ).trigger( 'change' );
		$( '#rejectReason' ).val( [ 'n' ] ).trigger( 'change' );
		if ( action === 'reject' ) {
			$( '#declineRejectReject' ).trigger( 'click' );
		}
		$( '#declineNotifyUser' ).prop( 'checked', action === 'decline' ? notify : !notify );
		$( '#rejectNotifyUser' ).prop( 'checked', action === 'reject' ? notify : !notify );
		$( '#csdSubmission' ).prop( 'checked', true );
		$( '#afchSubmitForm' ).trigger( 'click' );

		await waitFor( () => AFCH.actions.logCSD.mock.calls.length );
		if ( notify ) {
			await waitFor( () => editPage.mock.calls.length === 2 );
		} else {
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 30 );
			} );
		}
		const editedTitles = editPage.mock.calls.map( ( call ) => call[ 0 ] );
		expect( editedTitles ).toEqual( notify ? [ 'Draft:Example', 'User talk:Author' ] : [ 'Draft:Example' ] );
		expect( getCategories ).toHaveBeenCalledTimes( notify && action === 'decline' ? 1 : 0 );
		if ( notify ) {
			expect( editPage.mock.calls[ 1 ][ 1 ].contents ).toContain( action === 'decline' ? 'Afc decline' : 'Afc reject' );
			expect( editPage.mock.calls[ 1 ][ 1 ].contents.includes( 'Teahouse/AfC invitation' ) ).toBe( action === 'decline' );
		}
		expect( AFCH.actions.logCSD ).toHaveBeenCalledWith( expect.objectContaining( {
			usersNotified: notify ? [ 'Author' ] : []
		} ) );
	} );
} );
