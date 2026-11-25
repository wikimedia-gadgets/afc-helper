/**
 * Tests for src/modules/actions.js
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
