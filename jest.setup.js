/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

inUnitTestEnvironment = true;

mw = {};
mediaWiki = {};

mw.config = {
	get: jest.fn()
};

mw.config.get.mockImplementation( ( requested ) => {
	if ( requested === 'wgPageName' ) {
		return 'Draft:Foo';
	} else if ( requested === 'wgNamespaceNumber' ) {
		return 118;
	} else if ( requested === 'wgMonthNames' ) {
		return [ '', 'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December' ];
	}
} );

mw.loader = {
	using: function () {
		return Promise.resolve();
	}
};


// Minimal mw.Title mock used by core.Page in unit tests
mw.Title = function ( name ) {
	this.name = name || '';
};

mw.Title.prototype.getPrefixedText = function () {
	return this.name;
};

mw.Title.prototype.getMainText = function () {
	const parts = this.name.split( ':' );
	return parts.length > 1 ? parts.slice( 1 ).join( ':' ) : this.name;
};

mw.Title.prototype.getNamespaceId = function () {
	if ( this.name.indexOf( 'User:' ) === 0 ) {
		return 2;
	}
	if ( this.name.indexOf( 'Draft:' ) === 0 ) {
		return 118;
	}
	// fall back to configured namespace number or 0
	try {
		return mw.config.get( 'wgNamespaceNumber' ) || 0;
	} catch ( e ) {
		return 0;
	}
};

mw.user = {
	getName: jest.fn()
};

// Mirror mocks onto `mediaWiki` so modules that receive `mediaWiki` as
// their `mw` parameter see the same mocks.
mediaWiki.Title = mw.Title;
mediaWiki.config = mw.config;
mediaWiki.user = mw.user;
mediaWiki.loader = mw.loader;

$ = require( 'jquery' );
jQuery = $;

require( './src/afch.js' );
require( './src/modules/core.js' );
require( './src/modules/submissions.js' );
