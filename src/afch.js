// <nowiki>
( function () {
	// Check that we're in a namespace that uses AFCH.
	// In the gadget, namespaces are checked by the gadgets extension, and the below check is not needed, since we defined namespaces in MediaWiki:Gadgets-definition.
	// But in server.js, we don't get this gadget check, so we need to check it below. Else you'll get AFCH appearing on the Main Page :)
	const userNamespace = 2;
	const draftNamespace = 118;
	if ( ![ draftNamespace, userNamespace ].includes( mw.config.get( 'wgNamespaceNumber' ) ) ) {
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

	AFCH._scriptFiles = {
		// Bootstrap files establish the core APIs and loader before modules can initialize.
		bootstrap: [
			'core.js',
			'page.js',
			'actions.js',
			'core-utils.js'
		],
		// Modules are feature entry points selected by AFCH.load().
		modules: {
			submissions: 'submissions.js'
		},
		// Submodules are ordered dependencies loaded before their feature module.
		submodules: {
			submissions: [
				'submission-model.js',
				'text.js'
			]
		}
	};

	AFCH._loadScripts = function ( files ) {
		return files.reduce( ( promise, file ) => promise.then( () => $.getScript(
			AFCH.consts.baseurl + '/' + file
		) ), $.Deferred().resolve() );
	};

	AFCH._loadScripts( AFCH._scriptFiles.bootstrap ).done( () => {
		const loaded = AFCH.load();
		if ( !loaded ) {
			mw.notify( 'AFCH could not be loaded: ' + ( AFCH.error || 'unknown error' ),
				{ title: 'AFCH error' } );
		}
	} );
}() );
// </nowiki>
