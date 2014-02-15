//<nowiki>
( function ( $, mw ) {
	var pageName = mw.config.get( 'wgPageName' ), type;

	if ( pageName.indexOf( 'Wikipedia:Articles_for_creation/' ) !== -1 ||
		pageName.indexOf( 'Wikipedia_talk:Articles_for_creation/' ) !== -1 ||
		pageName.indexOf( 'User:' ) !== -1 ) {
		type = 'submissions';
	} else if ( pageName.indexOf( 'Wikipedia:Articles_for_creation/Redirects' ) !== -1 ) {
		type = 'redirects';
	} else if ( pageName.indexOf( 'Wikipedia:Files_for_upload' ) !== -1 ) {
		type = 'ffu';
	}

	if ( type ) {
		// Initialize the AFCH object
		window.AFCH = {};

		// Set up constants
		AFCH.consts = {};

		// Master version data
		AFCH.consts.version = 0.1;
		AFCH.consts.versionName = 'Exploding Fireball';

		// FIXME: Change when moving into production
		AFCH.consts.beta = true;

		AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
			'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afch.js';

		// FIXME: Right now mw.loader.using doesn't let you load urls :(
		$.getScript( AFCH.consts.baseurl + '/core.js' ).done( function () {
			AFCH.log( 'core.js loaded' );

			if ( AFCH.beforeLoad() ) {
				AFCH.load( type );
			} else {
				mw.notify( 'AFCH could not be loaded:' + ( AFCH.error ? AFCH.error : 'unknown error' ),
					{ title: 'AFCH error' } );
			}
		} );
	}
}( jQuery, mediaWiki ) );
//</nowiki>
