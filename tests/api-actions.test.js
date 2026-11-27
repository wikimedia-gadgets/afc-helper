/**
 * Tests for src/js/api-actions.js
 */

/* eslint-env jest */

describe( 'AFCH.actions.addLogHeaderIfNeeded()', () => {
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	const now = new Date();
	const currentHeader = '=== ' + monthNames[ now.getUTCMonth() ] + ' ' + now.getUTCFullYear() + ' ===';

	it( 'adds the current month header when one is missing', () => {
		expect( AFCH.actions.addLogHeaderIfNeeded( '' ) ).toBe( '\n\n' + currentHeader );
	} );

	it( 'does not add a duplicate current month header', () => {
		expect( AFCH.actions.addLogHeaderIfNeeded( currentHeader + '\n# Existing log entry' ) ).toBe( '' );
	} );
} );

describe( 'AFCH.actions.notifyUser()', () => {
	let originalApi, originalPrefs, originalConsts;

	beforeEach( () => {
		originalApi = AFCH.api;
		originalPrefs = AFCH.prefs;
		originalConsts = AFCH.consts;
	} );

	afterEach( () => {
		jest.restoreAllMocks();
		AFCH.api = originalApi;
		AFCH.prefs = originalPrefs;
		AFCH.consts = originalConsts;
	} );

	it.each( [
		{
			autoSubscribe: false,
			apiAction: 'edit',
			titleProperty: 'title',
			expectedTitle: 'User talk:Novem Linguae',
			textProperty: 'appendtext',
			expectedText: '\n\nNotice',
			success: 'Success',
			queryCount: 2
		},
		{
			autoSubscribe: true,
			apiAction: 'discussiontoolsedit',
			titleProperty: 'page',
			expectedTitle: 'User talk:Novem Linguae',
			textProperty: 'wikitext',
			expectedText: 'Notice',
			success: 'success',
			queryCount: 2
		}
	] )( 'follows user talk page redirects when autoSubscribe=$autoSubscribe', async ( {
		autoSubscribe, apiAction, titleProperty, expectedTitle, textProperty, expectedText, success, queryCount
	} ) => {
		AFCH.api = {
			get: jest.fn( ( request ) => $.Deferred().resolve( {
				query: {
					pages: request.redirects ?
						{ 456: { pageid: 456, title: 'User talk:Novem Linguae' } } :
						{ 123: { pageid: 123, title: 'User talk:NovemBot' } }
				}
			} ) ),
			postWithEditToken: jest.fn().mockReturnValue( $.Deferred().resolve( {
				[ apiAction ]: { result: success, newrevid: 123 }
			} ) )
		};
		AFCH.prefs = { autoSubscribe: autoSubscribe, noWatch: false };
		AFCH.consts = {
			mockItUp: false,
			tag: 'AFCH',
			nullstatus: { update: jest.fn() }
		};

		await expect( AFCH.actions.notifyUser( 'NovemBot', {
			message: 'Notice',
			hide: true
		} ) ).resolves.toBeUndefined();

		expect( AFCH.api.get ).toHaveBeenNthCalledWith( 1, {
			action: 'query',
			prop: 'info',
			titles: 'User talk:NovemBot'
		} );
		expect( AFCH.api.get ).toHaveBeenCalledTimes( queryCount );
		expect( AFCH.api.get ).toHaveBeenNthCalledWith( 2, {
			action: 'query',
			prop: 'info',
			titles: 'User talk:NovemBot',
			redirects: true
		} );

		const expectedRequest = {
			action: apiAction,
			[ titleProperty ]: expectedTitle,
			[ textProperty ]: expectedText
		};
		if ( !autoSubscribe ) {
			expectedRequest.redirect = true;
		}
		expect( AFCH.api.postWithEditToken ).toHaveBeenCalledWith( expect.objectContaining( expectedRequest ) );
	} );
} );
