/**
 * Tests for src/modules/submission.js
 */

/* eslint-env jest */

require( './scaffold.js' );

resetToAFCApplicablePage();

require( './../src/modules/core.js' );
require( './../src/modules/submissions.js' );

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
	} );
} );

describe( 'AFCH.Text.cleanUp', () => {
	it( 'simple accept', () => {
		const wikicode = 'Test';
		const isAccept = true;
		const output = ( new AFCH.Text( wikicode ) ).cleanUp( isAccept );
		expect( output ).toBe( 'Test' );
	} );
} );
