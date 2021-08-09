//<nowiki>
( function () {
	// Check that we're in the right namespace and on the right page
	switch ( mw.config.get( 'wgNamespaceNumber' ) ) {
		case 4: // Wikipedia
		case 5: // Wikipedia talk
			var pageName = mw.config.get( 'wgTitle' );
			// return nothing for now, all drafts are now under Draft namespace
			// currently only the article submission script is running here.
			// to be used when script(s) for other modules such as category and
			// redirect requests are reintergrated into here.
			if ( pageName !== 'Articles for creation/sandbox' ) {
				return;
			}
			break;
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
}() );
//</nowiki>
