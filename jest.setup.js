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
	}
} );

mw.loader = {
	using: function () {
		return {
			then: function ( callback ) {
				callback();
			}
		};
	}
};

mw.user = {
	getName: jest.fn()
};

$ = require( 'jquery' );
jQuery = $;

require( './src/afch.js' );
require( './src/modules/core.js' );
require( './src/modules/submissions.js' );
