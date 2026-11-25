/**
 * Tests for src/js/page.js
 */

/* eslint-env jest */

describe( 'AFCH.Page', () => {
	afterEach( () => {
		jest.restoreAllMocks();
	} );

	it( 'returns the page title from toString()', () => {
		const page = new AFCH.Page( 'Example' );

		expect( page.toString() ).toBe( 'Example' );
	} );

	it( 'caches revision data after the first request', () => {
		const revision = {
			timestamp: '2024-01-01T00:00:00Z',
			user: 'Example editor',
			parsetree: '<root />',
			revid: 123
		};
		const getPageText = jest.spyOn( AFCH.actions, 'getPageText' )
			.mockReturnValue( $.Deferred().resolve( 'Example text', revision ) );
		const page = new AFCH.Page( 'Example' );

		expect( page.getText( false ).state() ).toBe( 'resolved' );
		expect( page.getText( true ).state() ).toBe( 'resolved' );
		expect( getPageText ).toHaveBeenCalledTimes( 1 );
		expect( page.additionalData.revId ).toBe( 123 );
	} );

	it( 'returns itself when the page is already in a talk namespace', () => {
		const page = new AFCH.Page( 'Talk:Example' );

		expect( page.getTalkPage() ).toBe( page );
	} );
} );
