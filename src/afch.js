//<nowiki>
( function ( $, mw ) {
	var pageName = mw.config.get( 'wgPageName' ), type;

	// Check if we're on a page that's in AFCH scope (meaning its name begins
	// with a certain string), and if so, set the type of subscript to be run
	if ( pageName.indexOf( 'Wikipedia:Articles_for_creation/' ) === 0 ||
		pageName.indexOf( 'Wikipedia_talk:Articles_for_creation/' ) === 0 ||
		pageName.indexOf( 'User:' ) === 0 ||
		pageName.indexOf( 'Draft:' ) === 0 )
	{
		type = 'submissions';
	} else if ( pageName.indexOf( 'Wikipedia:Articles_for_creation/Redirects' ) === 0 ) {
		type = 'redirects';
	} else if ( pageName.indexOf( 'Wikipedia:Files_for_upload' ) === 0 ) {
		type = 'ffu';
	}

	if ( type ) {
		// Initialize the AFCH object
		window.AFCH = {};

		// Set up constants
		AFCH.consts = {};

		// Master version data
		AFCH.consts.version = 0.8;
		AFCH.consts.versionName  = 'Less is More';

		// FIXME: Change when moving into production
		AFCH.consts.beta = true;

		AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
			'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afch.js';

		// FIXME: Right now mw.loader.using doesn't let you load urls :(
		$.getScript( AFCH.consts.baseurl + '/core.js' ).done( function () {
			var loaded = AFCH.load( type );
			if ( !loaded ) {
				mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
					{ title: 'AFCH error' } );
			}
		} );
	}
}( jQuery, mediaWiki ) );
//</nowiki>
