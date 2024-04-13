// Since AFCH is currently stored in the userspace, this script should be used
// to load AFCH from another place (e.g., the core Gadget file).

/////////////////////////////////////////////////////////
/////////////////// AfC Helper Script ///////////////////
///////// https://en.wikipedia.org/wiki/WP:AFCH /////////
//// https://github.com/wikimedia-gadgets/afc-helper ////
/////////////////////////////////////////////////////////

( function ( mw, importScript ) {
	if ( /^(?:User:|Draft:|Wikipedia(?:_talk)?:Articles_for_creation)/.test( mw.config.get( 'wgPageName' ) ) ) {
		importScript( 'MediaWiki:Gadget-afchelper.js' );
	}
}( mediaWiki, importScript ) );
