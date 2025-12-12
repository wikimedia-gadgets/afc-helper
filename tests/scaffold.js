/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

const resetToBase = function () {
	const fileSystem = require( 'fs' );
	const basePageHtml = fileSystem.readFileSync( './tests/test-frame.html' ).toString();
	// Set the base document content using jsdom
	document.documentElement.innerHtml = basePageHtml;
	AFCH = undefined;
	$ = require( 'jquery' );
	jQuery = $;
};

const setPageTitle = function ( title ) {
	mw.config.get.mockImplementation( ( requested ) => {
		if ( requested === 'wgPageName' ) {
			return title;
		} else if ( requested === 'wgNamespaceNumber' ) {
			if ( title.indexOf( 'Draft:' ) === 0 ) {
				return 118;
			}
		} else if ( requested === 'wgMonthNames' ) {
			return [ '', 'January', 'February', 'March', 'April', 'May', 'June',
				'July', 'August', 'September', 'October', 'November', 'December' ];
		}
	} );
};

resetToAFCApplicablePage = function () {
	resetToBase();
	setPageTitle( 'Draft:Foo' );
	require( './../src/afch.js' );
};

inUnitTestEnvironment = true;

jest.autoMockOff();

// Mocked later
mw = {};
mediaWiki = {};

// We're always mocking this, what the heck
mw.config = {
	get: jest.fn()
};

mw.config.get.mockImplementation( ( requested ) => {
	if ( requested === 'wgMonthNames' ) {
		return [ '', 'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December' ];
	}
	return undefined;
} );

mw.user = {
	getName: jest.fn()
};

mw.loader = {
	using: function () {
		return {
			then: function ( callback ) {
				callback();
			}
		};
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

// Mirror mocks onto `mediaWiki` so modules that receive `mediaWiki` as
// their `mw` parameter see the same mocks.
mediaWiki.Title = mw.Title;
mediaWiki.config = mw.config;
mediaWiki.user = mw.user;
mediaWiki.loader = mw.loader;

resetToBase();
