//<nowiki>
( function () {
	// Check that we're in the right namespace and on the right page
	switch ( mw.config.get( 'wgNamespaceNumber' ) ) {
		case 4: // Wikipedia
		case 5: // Wikipedia talk
			var i = -1;
			var pageName = mw.config.get( 'wgTitle' );
			while ( ++i < 22 ) { // 'Articles for creation/'.length === 22
				if ( pageName.charCodeAt( i ) !== 'Articles for creation/'.charCodeAt( i ) ) {
					return;
				}
			}
			if ( pageName === 'Wikipedia:Articles_for_creation/Redirects' ) {
				return;
			}
			break;
		case 2: // User
		case 118: // Draft
			break;
		default:
			return;
	}

	mw.loader.using( [
		'jquery.chosen',
		'jquery.spinner',
		'jquery.ui',

		'mediawiki.api',
		'mediawiki.util',
		'mediawiki.user'
	] ).then( function () {

		// Initialize the AFCH object
		window.AFCH = {};

		// Set up constants
		AFCH.consts = {};

		AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );

		// These next two statements (setting beta and baseurl) may be modified
		// by the uploading script! If you change them, check that the uploading
		// script at scripts/upload.py doesn't break.
		AFCH.consts.beta = true;
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
			'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afch.js';

		$.getScript( AFCH.consts.baseurl + '/core.js' ).done( function () {
			var loaded = AFCH.load( 'submissions' ); // perhaps eventually there will be more modules besides just 'submissions'
			if ( !loaded ) {
				mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
					{ title: 'AFCH error' } );
			}
		} );
	} );
}() );
//</nowiki>
