// Serves the script from localhost for development purposes.

const https = require('https');
const fs = require('fs');

const argv = require('minimist')(process.argv);

const options = {
	key: fs.readFileSync(argv.key || 'key.pem'),
	cert: fs.readFileSync(argv.cert || 'cert.pem')
};

const port = process.env.PORT || argv.port || 4444;
console.log(`Serving AFCH at https://localhost:${port} (Ctrl+C to stop). To install: open Wikipedia (English, Test, or whatever), navigate to "Special:MyPage/common.js", edit/create it, and add this on a new line (if it's not there yet):\n\n  mw.loader.load('https://localhost:${port}?ctype=text/javascript&title=afch-dev.js', 'text/javascript' );`);

https.createServer(options, function (req, res) {
	const reqUrl = new URL(req.url, `http://${req.headers.host}`);
	if((!reqUrl.searchParams.has("ctype")) || (!reqUrl.searchParams.has("title"))) {
		res.writeHead(400);
		res.end("Parameters 'ctype' and/or 'title' not present.");
		return;
	}
	res.writeHead(200, {
		"Content-Type": reqUrl.searchParams.get("ctype"),
		"Access-Control-Allow-Origin": "*",
	});
	var reqTitle = reqUrl.searchParams.get("title");
	var filename = null;

	// This is the reverse of what happens to filenames in scripts/upload.py
	if(reqTitle.endsWith("core.js")) {
		filename = "build/modules/core.js";
	} else if(reqTitle.endsWith("submissions.js")) {
		if(reqTitle.endsWith("tpl-submissions.js")) {
			filename = "build/templates/tpl-submissions.html";
		} else {
			filename = "build/modules/submissions.js";
		}
	} else if(reqTitle.endsWith("tpl-preferences.js")) {
		filename = "build/templates/tpl-preferences.html";
	} else if(reqTitle.endsWith(".css")) {
		filename = "build/afch.css";
	} else if(reqTitle.endsWith(".js")) {
		// Assume all other JS files are the root. This probably isn't ideal.
		filename = "build/afch.js";
	} else {
		console.error(`bad filename ${filename}`);
	}
	var content = fs.readFileSync(filename, { encoding: "utf-8" });
	content = content.replace(
		"AFCH.consts.scriptpath = mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );",
		`AFCH.consts.scriptpath = 'https://localhost:${port}';`
	);
	res.end(content);
}).listen(port);
