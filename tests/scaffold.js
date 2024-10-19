/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

jest.autoMockOff();

const fs = require( 'fs' );

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

const basePageHtml = fs.readFileSync( './tests/test-frame.html' ).toString();

const setPageTitle = function ( title ) {
	mw.config.get.mockImplementation( ( requested ) => {
		if ( requested === 'wgPageName' ) {
			return title;
		} else if ( requested === 'wgNamespaceNumber' ) {
			if ( title.indexOf( 'Draft:' ) === 0 ) {
				return 118;
			}
		}
	} );
};

const resetToBase = function () {
	// Set the base document content using jsdom
	document.documentElement.innerHtml = basePageHtml;
	AFCH = undefined;
	const jQuery = $ = require( 'jquery' );
};

resetToBase();

const resetToAFCApplicablePage = function () {
	resetToBase();
	setPageTitle( 'Draft:Foo' );
	require( './../src/afch.js' );
};
