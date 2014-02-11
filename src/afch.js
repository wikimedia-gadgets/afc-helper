//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js]]
( function ( mw, window ) {
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
		AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
			'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afchelper.js';

		// FIXME: Right now mw.loader.using doesn't let you load urls :(
		$.getScript( AFCH.consts.baseurl + '/core.js', function () {
			if ( AFCH.beforeLoad() ) {
				AFCH.load( type );
			} else {
				mw.notify( 'AFCH could not be loaded:' + ( AFCH.error ? AFCH.error : 'unknown error' ),
					{ title: 'AFCH error' } );
			}
		} );
	}
}( mediaWiki, window ) );
//</nowiki>
