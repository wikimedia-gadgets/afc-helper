/**
 * Tests for src/js/submission-warnings.js
 */

/* eslint-env jest */

describe( 'AFCH.getSubmissionWarnings', () => {
	let originalApi, originalConsts, submission, blockData;

	beforeEach( () => {
		originalApi = AFCH.api;
		originalConsts = AFCH.consts;
		AFCH.consts = { pagename: 'Draft:Example', user: 'Reviewer' };
		AFCH.api = {
			get: jest.fn( ( params ) => {
				if ( params.list === 'logevents' ) {
					return $.Deferred().resolve( { query: { logevents: [] } } );
				}
				if ( params.list === 'blocks' ) {
					return $.Deferred().resolve( { query: { blocks: blockData } } );
				}
				return $.Deferred().resolve( { pagetriagelist: { pages: [ {} ] } } );
			} )
		};
		blockData = [];

		jest.spyOn( mw.config, 'get' ).mockImplementation( ( key ) => {
			if ( key === 'wgArticleId' ) {
				return 1;
			}
			if ( key === 'wgCurRevisionId' ) {
				return 10;
			}
			return undefined;
		} );

		submission = {
			shortTitle: 'Example',
			isUnderReview: true,
			params: { reviewer: 'Reviewer' },
			getSubmitter: () => $.Deferred().resolve( 'Author' )
		};
	} );

	afterEach( () => {
		jest.restoreAllMocks();
		AFCH.api = originalApi;
		AFCH.consts = originalConsts;
	} );

	function getWarnings( onUnmark ) {
		return new Promise( ( resolve ) => {
			AFCH.getSubmissionWarnings( {
				page: { getText: () => $.Deferred().resolve( '' ) },
				submission: submission,
				views: { renderView: jest.fn() },
				onUnmark: onUnmark
			} ).done( resolve );
		} );
	}

	it( 'adds an under-review warning and invokes the unmark callback', async () => {
		const onUnmark = jest.fn(),
			warnings = await getWarnings( onUnmark );

		expect( $( warnings[ 0 ] ).text() ).toContain( 'You already began reviewing this submission.' );
		$( warnings[ 0 ] ).find( 'a' ).trigger( 'click' );
		expect( onUnmark ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'warns when the submitter is currently blocked', async () => {
		submission.isUnderReview = false;
		blockData = [ {
			expiry: 'infinity',
			by: 'Admin',
			reason: 'Test block'
		} ];

		const warnings = await getWarnings( jest.fn() );

		expect( $( warnings[ 0 ] ).text() )
			.toContain( 'Submitter Author was blocked by Admin with an expiry time of infinity. Reason: Test block' );
	} );
} );
