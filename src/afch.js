//<nowiki>
( function ( $, mw ) {
	var subscriptToLoad = false,
		pageName = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),

		// `loadMap` determines which scripts should be loaded
		// on each page. Each key is a subscript name and
		// its value is a list of page prefixes on which it
		// should be loaded.

		loadMap = {
			// `submissions.js` is for reviewing textual
			// Articles for Creation submissions.
			submissions: [
				'Wikipedia:Articles for creation/',
				'Wikipedia talk:Articles for creation/',
				'User:',
				'Draft:'
			]
		};

	$.each( loadMap, function ( script, prefixes ) {
		$.each( prefixes, function ( _, prefix ) {
			if ( pageName.indexOf( prefix ) === 0 ) {
				subscriptToLoad = script;
				return false;
			}
		} );

		// Return false and break out of the loop if already found
		return !!subscriptToLoad;
	} );

	if ( subscriptToLoad ) {
		// Initialize the AFCH object
		window.AFCH = {};

		// Set up constants
		AFCH.consts = {};
		// AFCH.consts.mockItUp = true;
		// Master version data
		AFCH.consts.version = '0.9.1';
		AFCH.consts.versionName = 'Imperial Ibex';

		// FIXME: Change when moving into production
		AFCH.consts.beta = true;

		AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
			'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afch.js';

		$.getScript( AFCH.consts.baseurl + '/core.js' ).done( function () {
			var loaded = AFCH.load( subscriptToLoad );
			if ( !loaded ) {
				mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
					{ title: 'AFCH error' } );
			}
		} );
	}
}( jQuery, mediaWiki ) );
//</nowiki>
