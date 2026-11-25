/* eslint-env node, es2021 */
/* eslint-disable */

// Serves the script from localhost for development purposes.
// Note that we serve the un-built JS files from src/ instead of the built JS
// files from build/. This avoids having to run the build process every time.
// The build process does almost nothing for JS (as it just concatenates the
// hogan file).

const child_process = require('child_process');
const fs = require('fs');
const http = require('http');
const process = require('process');

const HOGAN_FILE = 'node_modules/hogan.js/build/gh-pages/builds/2.0.0/hogan-2.0.0.js';
const SCRIPT_FILES = {
	'core-utils.js': 'src/modules/core-utils.js',
	'page.js': 'src/modules/page.js',
	'actions.js': 'src/modules/actions.js',
	'submission-model.js': 'src/modules/submission-model.js',
	'text.js': 'src/modules/text.js',
	'submissions.js': 'src/modules/submissions.js',
	'tpl-preferences.js': 'src/templates/tpl-preferences.html',
	'tpl-submissions.js': 'src/templates/tpl-submissions.html',
	'core.js': 'src/modules/core.js'
};
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
		content += readFile(HOGAN_FILE) + ';';
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
		// Assume all other JS files are the root. This probably isn't ideal.
		content += readFile("src/afch.js");
		content = content.replace(
			"AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );",
			`AFCH.consts.scriptpath = 'http://localhost:${port}';`
		);
	} else {
		console.error(`bad filename: ${reqTitle}`);
	}
	res.end(content);
}).listen(port);
