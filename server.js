/* eslint-env node, es2021 */
/* eslint-disable */

// Serves the script from localhost for development purposes.

const http = require('http');
const fs = require('fs/promises');

const argv = require('minimist')(process.argv);
async function readFile(path) {
	return (await fs.readFile(path, { encoding: 'utf-8' })).toString();
}

const port = process.env.PORT || argv.port || 4444;
console.log(`Serving AFCH at http://localhost:${port} (Ctrl+C to stop). To install: go to https://test.wikipedia.org/w/index.php?title=Special:MyPage/common.js&action=edit (logging in if you get an error) and add this on a new line if it's not there yet:
  mw.loader.load('http://localhost:${port}?ctype=text/javascript&title=afch-dev.js', 'text/javascript' );
Reminder: you must run "grunt build" (no quotes) again you make any CSS code changes.`);

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
	var filename = null;

	// This is the reverse of what happens to filenames in scripts/upload.py
	var content = '';
	if(reqTitle.endsWith("core.js")) {
		content += await readFile('node_modules/hogan.js/build/gh-pages/builds/2.0.0/hogan-2.0.0.js') + ';';
		content += await readFile("src/modules/core.js");
	} else if(reqTitle.endsWith("submissions.js")) {
		if(reqTitle.endsWith("tpl-submissions.js")) {
			content += await readFile("src/templates/tpl-submissions.html");
		} else {
			content += await readFile("src/modules/submissions.js");
		}
	} else if(reqTitle.endsWith("tpl-preferences.js")) {
		content += await readFile("src/templates/tpl-preferences.html");
	} else if(reqTitle.endsWith(".css")) {
		content += await readFile("build/afch.css");
	} else if(reqTitle.endsWith(".js")) {
		// Assume all other JS files are the root. This probably isn't ideal.
		content += await readFile("src/afch.js");
		content = content.replace(
			"AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );",
			`AFCH.consts.scriptpath = 'http://localhost:${port}';`
		);
	} else {
		console.error(`bad filename ${filename}`);
	}
	res.end(content);
}).listen(port);