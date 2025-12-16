/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

inUnitTestEnvironment = true;

window.AFCH = {};

$ = require( 'jquery' );
jQuery = $;

const _originalMwConfigGet = mw.config.get;
mw.config.get = jest.fn( ( key ) => {
	if ( key === 'wgMonthNames' ) {
		return [ '', 'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December' ];
	}

	if ( typeof _originalMwConfigGet === 'function' ) {
		return _originalMwConfigGet.call( mw.config, key );
	}

	return undefined;
} );

require( './src/afch.js' );
require( './src/modules/core.js' );
require( './src/modules/submissions.js' );
