/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

jest.autoMockOff();

fs = require( 'fs' );

// Mocked later
mediaWiki = mw = {};

// We're always mocking this, what the heck
mw.config = {
	get: jest.fn()
};

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

var basePageHtml = fs.readFileSync( './tests/test-frame.html' ).toString();

requireScript = function ( name ) {
	return require( './../src/' + name );
};

setPageTitle = function ( title ) {
	mw.config.get.mockImplementation( function ( requested ) {
		if ( requested === 'wgPageName' ) {
			return title;
		} else if ( requested === 'wgNamespaceNumber' ) {
			if ( title.indexOf( 'Draft:' ) === 0 ) {
				return 118;
			}
		}
	} );
};

resetToBase = function () {
	// Set the base document content using jsdom
	document.documentElement.innerHtml = basePageHtml;
	AFCH = undefined;
	jQuery = $ = require( 'jquery' );
};

resetToBase();

resetToAFCApplicablePage = function () {
	resetToBase();
	setPageTitle( 'Draft:Foo' );
	requireScript( 'afch.js' );
};
