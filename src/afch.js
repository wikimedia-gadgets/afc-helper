// <nowiki>
( function () {
	// Check that we're in the right namespace
	// In the gadget, this is checked by ResourceLoader and not needed.
	// But in server.js, we need to check it manually. Else you'll get AFCH appearing on the Main Page :)
	switch ( mw.config.get( 'wgNamespaceNumber' ) ) {
		case 2: // User
		case 118: // Draft
			break;
		default:
			return;
	}

	// Initialize the AFCH object
	window.AFCH = {};

	// Set up constants
	AFCH.consts = {};

	AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );

	// These next two statements (setting beta and baseurl) may be modified
	// by the uploading script! If you change them, check that the uploading
	// script at scripts/deploy.js doesn't break.
	AFCH.consts.beta = true;
	AFCH.consts.baseurl = AFCH.consts.scriptpath +
		'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afchelper.js';

	$.getScript( AFCH.consts.baseurl + '/core.js' ).done( () => {
		const loaded = AFCH.load( 'submissions' ); // perhaps eventually there will be more modules besides just 'submissions'
		if ( !loaded ) {
			mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
				{ title: 'AFCH error' } );
		}
	} );
}() );
// </nowiki>
