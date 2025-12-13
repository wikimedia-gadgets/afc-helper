/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

function resetToBase() {
	const fileSystem = require( 'fs' );
	const basePageHtml = fileSystem.readFileSync( './tests/test-frame.html' ).toString();
	// Set the base document content using jsdom
	document.documentElement.innerHtml = basePageHtml;
	AFCH = undefined;
	$ = require( 'jquery' );
	jQuery = $;
}

function setPageTitle( title ) {
	mw.config.get.mockImplementation( ( requested ) => {
		if ( requested === 'wgPageName' ) {
			return title;
		} else if ( requested === 'wgNamespaceNumber' ) {
			if ( title.indexOf( 'Draft:' ) === 0 ) {
				return 118;
			}
		}
	} );
}

/** This intentionally has global scope. Is called at the top of each test page. */
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

resetToBase();
