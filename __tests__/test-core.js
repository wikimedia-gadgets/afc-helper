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
