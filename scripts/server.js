/* eslint-env node, es2021 */
/* eslint-disable */

// Serves the script from localhost for development purposes.
// Note that we serve the un-built JS files from src/ instead of the built JS
// files from build/. This avoids having to run the build process every time.
// The build process copies the JS files and the Hogan dependency.

const child_process = require('child_process');
const fs = require('fs');
const http = require('http');
const process = require('process');

const HOGAN_FILE = 'node_modules/hogan.js/build/gh-pages/builds/2.0.0/hogan-2.0.0.js';
const SCRIPT_FILES = {
	'hogan.js': HOGAN_FILE,
	'core-utils.js': 'src/js/core-utils.js',
	'wikitext-utils.js': 'src/js/wikitext-utils.js',
	'page.js': 'src/js/page.js',
	'api-actions.js': 'src/js/api-actions.js',
	'submission-model.js': 'src/js/submission-model.js',
	'submission-text.js': 'src/js/submission-text.js',
	'submission-warnings.js': 'src/js/submission-warnings.js',
	'submission-actions.js': 'src/js/submission-actions.js',
	'submission-forms.js': 'src/js/submission-forms.js',
	'preferences.js': 'src/js/preferences.js',
	'submission-panel.js': 'src/js/submission-panel.js',
	'tpl-preferences.js': 'src/templates/tpl-preferences.html',
	'tpl-submissions.js': 'src/templates/tpl-submissions.html',
	'core.js': 'src/js/core.js'
};
const GADGET_SCRIPTS = [
	'src/afch.js',
	HOGAN_FILE,
	'src/js/core.js',
	'src/js/page.js',
	'src/js/api-actions.js',
	'src/js/core-utils.js',
	'src/js/wikitext-utils.js',
	'src/js/preferences.js',
	'src/js/submission-model.js',
	'src/js/submission-text.js',
	'src/js/submission-warnings.js',
	'src/js/submission-actions.js',
	'src/js/submission-forms.js',
	'src/js/submission-panel.js'
];
const DEPENDENCIES = [
	'mediawiki.api', 'mediawiki.util', 'mediawiki.user', 'mediawiki.Title',
	'mediawiki.Uri', 'mediawiki.storage', 'jquery.chosen', 'jquery.spinner', 'jquery.ui'
];
// A script suffix is the ending part of a requested script filename that matches one of the keys in SCRIPT_FILES.
// For example, if the requested filename is "afch-core.js", the script suffix would be "core.js".
const SCRIPT_SUFFIXES = Object.keys(SCRIPT_FILES).sort( ( a, b ) => b.length - a.length );

if(!fs.existsSync(HOGAN_FILE)) {
	console.log('No file found at ' + HOGAN_FILE + ' - downloading it with "npm install"...');
	child_process.execSync('npm install', { stdio: 'inherit' });
}

if(!fs.existsSync('build/afch.css')) {
	console.log('No file found at build/afch.css; building it with "grunt build"...');
	try {
		child_process.execSync('grunt build', { stdio: 'inherit' });
	} catch (e) {
		console.error('The grunt build failed. Check the output, fix any errors, and try again.');
		process.exit(1);
	}
}

const port = process.env.PORT || 4444;
console.log(`Serving AFCH on port ${port} (Ctrl+C to stop). Now browse to https://test.wikipedia.org/wiki/Main_Page?withJS=MediaWiki:Setup-afch-dev.js - make sure to log in if you aren't logged in. There should be a box with a link to your personal test draft.

Let us know if you see any errors: https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Articles_for_creation/Helper_script/Contributing#Need_help?

Reminder: each time you change the style (.less files), you must run "grunt build" (no quotes) again.`);

function readFile(path) {
	return fs.readFileSync(path, { encoding: 'utf-8' });
}

http.createServer({}, async function (req, res) {
	const reqUrl = new URL(req.url, `http://${req.headers.host}`);
	if((!reqUrl.searchParams.has("ctype")) || (!reqUrl.searchParams.has("title"))) {
		reqUrl.searchParams.set('ctype', 'text/javascript');
		reqUrl.searchParams.set('title', 'afch-dev.js');
	}
	res.writeHead(200, {
		"Content-Type": reqUrl.searchParams.get("ctype"),
		"Access-Control-Allow-Origin": "*",
	});
	var reqTitle = reqUrl.searchParams.get("title");

	// This is probably the reverse of what happens to filenames in scripts/deploy.js
	let content = '';
	const scriptSuffix = SCRIPT_SUFFIXES.find( ( suffix ) => reqTitle.endsWith( suffix ) );
	if ( scriptSuffix === 'core.js' ) {
		content += readFile( SCRIPT_FILES[ scriptSuffix ] );
		// enable mockItUp by default for testing
		content = content.replace(
			'mockItUp: AFCH.consts.mockItUp || false,',
			'mockItUp: AFCH.consts.mockItUp || true,'
		);
	} else if ( scriptSuffix ) {
		content += readFile( SCRIPT_FILES[ scriptSuffix ] );
	} else if ( reqTitle.endsWith( '.css' ) ) {
		content += readFile("build/afch.css");
	} else if ( reqTitle.endsWith( '.js' ) ) {
		// Serve the scripts together in the same order as the gadget definition.
		content = GADGET_SCRIPTS.map(readFile).join('\n;\n');
		content = content.replace(
			"AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );",
			`AFCH.consts.scriptpath = 'http://localhost:${port}';`
		);
		content = content.replace(
			'mockItUp: AFCH.consts.mockItUp || false,',
			'mockItUp: AFCH.consts.mockItUp || true,'
		);
		content = `(function () {
			if (![2, 118].includes(mw.config.get('wgNamespaceNumber'))) {
				return;
			}
			mw.loader.load('http://localhost:${port}/?ctype=text/css&title=MediaWiki:Gadget-afchelper.css', 'text/css');
			$.when($.ready, mw.loader.using(${JSON.stringify(DEPENDENCIES)})).done(function () {
				${content}
			}).fail(function (error) {
				console.error('AFCH dependencies failed to load', error);
				mw.notify('AFCH could not load its dependencies. See the browser console.', { title: 'AFCH error' });
			});
		}());`;
	} else {
		console.error(`bad filename: ${reqTitle}`);
	}
	res.end(content);
}).listen(port);
