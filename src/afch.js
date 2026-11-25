// <nowiki>
( function () {
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
		'?action=raw&ctype=text/javascript&title=MediaWiki:Gadget-afchelper';
}() );
// </nowiki>
