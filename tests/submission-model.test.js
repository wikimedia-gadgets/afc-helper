/**
 * Tests for src/js/submission-model.js
 */

/* eslint-env jest, node */
/* eslint-disable quotes */

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

describe( 'AFCH.Submission.addNewComment()', () => {
	it( 'adds a signature when the comment is unsigned', () => {
		const submission = new AFCH.Submission( new AFCH.Page( 'Test' ) );

		submission.addNewComment( 'Test comment' );

		expect( submission.comments[ 0 ].text ).toBe( 'Test comment ~~~~' );
	} );
} );

describe( 'AFCH.Submission.getSubmitter()', () => {
	let originalApi, submission;

	beforeEach( () => {
		originalApi = AFCH.api;
		AFCH.api = { get: jest.fn() };
		submission = new AFCH.Submission( new AFCH.Page( 'Test' ) );
	} );

	afterEach( () => {
		AFCH.api = originalApi;
	} );

	it( 'keeps an existing account name even if an older account had that name', async () => {
		submission.params.u = 'Nahida';
		AFCH.api.get.mockImplementation( ( request ) => {
			if ( request.list === 'users' ) {
				return $.Deferred().resolve( { query: { users: [ { name: 'Nahida', userid: 1 } ] } } );
			}
			return $.Deferred().resolve( {
				query: { logevents: [ { params: { newuser: 'Nahida~enwiki' } } ] }
			} );
		} );

		await expect( submission.getSubmitter() ).resolves.toBe( 'Nahida' );
		expect( AFCH.api.get ).toHaveBeenCalledTimes( 1 );
		expect( submission.params.u ).toBe( 'Nahida' );
	} );

	it( 'follows a renamed account until it finds an existing account', async () => {
		submission.params.u = 'OldName';
		AFCH.api.get.mockImplementation( ( request ) => {
			if ( request.list === 'users' ) {
				const user = request.ususers === 'CurrentName' ?
					{ name: 'CurrentName', userid: 1 } : { name: request.ususers, missing: true };
				return $.Deferred().resolve( { query: { users: [ user ] } } );
			}
			const newuser = request.letitle === 'User:OldName' ? 'MiddleName' : 'CurrentName';
			return $.Deferred().resolve( { query: { logevents: [ { params: { newuser: newuser } } ] } } );
		} );

		await expect( submission.getSubmitter() ).resolves.toBe( 'CurrentName' );
		expect( submission.params.u ).toBe( 'CurrentName' );
	} );

	it( 'preserves a missing name when there is no rename log', async () => {
		submission.params.u = 'MissingName';
		AFCH.api.get.mockImplementation( ( request ) => request.list === 'users' ?
			$.Deferred().resolve( { query: { users: [ { name: 'MissingName', missing: true } ] } } ) :
			$.Deferred().resolve( { query: { logevents: [] } } ) );

		await expect( submission.getSubmitter() ).resolves.toBe( 'MissingName' );
	} );

	it( 'preserves an IP submitter without looking up rename logs', async () => {
		submission.params.u = '192.0.2.1';
		AFCH.api.get.mockReturnValue( $.Deferred().resolve( {
			query: { users: [ { name: '192.0.2.1', invalid: true } ] }
		} ) );

		await expect( submission.getSubmitter() ).resolves.toBe( '192.0.2.1' );
		expect( AFCH.api.get ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'uses the page creator when no submitter is specified', async () => {
		jest.spyOn( submission.page, 'getCreator' ).mockReturnValue( $.Deferred().resolve( 'Creator' ) );
		await expect( submission.getSubmitter() ).resolves.toBe( 'Creator' );
		expect( AFCH.api.get ).not.toHaveBeenCalled();
	} );

	it( 'propagates account lookup errors', async () => {
		submission.params.u = 'Example';
		AFCH.api.get.mockReturnValue( $.Deferred().reject( 'api-error' ) );
		await expect( submission.getSubmitter() ).rejects.toBe( 'api-error' );
	} );

	it( 'propagates rename log lookup errors', async () => {
		submission.params.u = 'Example';
		AFCH.api.get.mockImplementation( ( request ) => request.list === 'users' ?
			$.Deferred().resolve( { query: { users: [ { name: 'Example', missing: true } ] } } ) :
			$.Deferred().reject( 'api-error' ) );
		await expect( submission.getSubmitter() ).rejects.toBe( 'api-error' );
	} );
} );
