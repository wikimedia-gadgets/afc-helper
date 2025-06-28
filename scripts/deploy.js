#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Command } = require('commander');
const { Mwn } = require('mwn');
const simpleGit = require('simple-git');

const TARGETS = {
    // Mapping of files in build directory to unprefixed page names
    'afch.js': 'afchelper.js',
    'afch.css': 'afchelper.css',
    'modules/core.js': 'afchelper.js/core.js',
    'modules/submissions.js': 'afchelper.js/submissions.js',
    'templates/tpl-preferences.html': 'afchelper.js/tpl-preferences.js',
    'templates/tpl-submissions.html': 'afchelper.js/tpl-submissions.js',
};
const EDIT_SUMMARY_ADVERT = ' (deploy.js)';

function readCredentials() {
    const filePath = path.join(__dirname, 'credentials.json');
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            exit('Failed to parse scripts/credentials.json: ' + e);
        }
    }
    return {};
}

function exit(msg) {
    console.error('ERROR: ' + msg);
    process.exit(1);
}

function resolveApiUrl(site) {
    if (site === 'enwiki') return 'https://en.wikipedia.org/w/api.php';
    if (site === 'testwiki') return 'https://test.wikipedia.org/w/api.php';
    if (/^https?:\/\//.test(site) && site.endsWith('api.php')) return site;
    return null;
}

(async () => {
    const program = new Command();
    program
        .option('-s, --site <url>', 'enwiki, testwiki, or a full wiki API endpoint')
        .option('-u, --username <username>', 'Wiki login username')
        .option('-p, --password <password>', 'Wiki login password')
        .option('-a, --accessToken <token>', 'OAuth2 access token (in place of username and password)')
        .option('-b, --base <base>', 'Base page name', 'MediaWiki:Gadget-')
        .option('-f, --force', 'Add --force flag while running grunt build')
        .allowUnknownOption(false)
        .parse(process.argv);

    // Merge CLI > credentials.json
    const conf = {
        ...readCredentials(),
        ...program.opts()
    }

    const apiUrl = resolveApiUrl(conf.site);
    if (!apiUrl) {
        exit('Missing or invalid --site! Pass enwiki, testwiki, or a full MediaWiki API URL, eg. https://en.wikipedia.org/w/api.php');
    }
    if ((!conf.username || !conf.password) && !conf.accessToken) {
        exit(`Incomplete login credentials: please provide either --accessToken or --username and --password. Or set them in scripts/credentials.json`);
    }

    // Build step
    let buildCmd = 'grunt build';
    if (conf.force) buildCmd += ' --force';
    console.log('Building afc-helper using', buildCmd);
    const build = spawnSync(buildCmd, { shell: true, stdio: 'pipe' });
    if (build.error || !build.stdout.toString().includes('Done')) {
        exit('Build failed:', build.stdout.toString() || build.error);
    } else {
        console.log('Build succeeded!');
    }

    // Git info
    const git = simpleGit();
    const branch = (await git.branch()).current;
    const sha1 = (await git.revparse(['HEAD']));
    const header = `/* Uploaded from https://github.com/wikimedia-gadgets/afc-helper, commit: ${sha1} (${branch}) */\n`;
    const hostname = new URL(apiUrl).hostname;
    const isMainGadget = (hostname === 'en.wikipedia.org') && (conf.base === 'MediaWiki:Gadget-');

    console.log(`Deploying to ${hostname} with base ${conf.base} ...`);

    // Login
    let bot;
    try {
        bot = await Mwn.init({
            apiUrl,
            username: conf.username,
            password: conf.password,
            OAuth2AccessToken: conf.accessToken,
            userAgent: 'https://github.com/wikimedia-gadgets/afc-helper deploy.js (mwn)',
            defaultParams: {
                assert: 'user',
                maxlag: 1000000,
            }
        });
    } catch (e) {
        exit('Login failed: ', e);
    }

    for (const [fileName, pageName] of Object.entries(TARGETS)) {
        const filePath = path.join(__dirname, '../build', fileName);
        const pageTitle = conf.base + pageName;

        let content = header + fs.readFileSync(filePath, 'utf8');
        content = content.replace(/MediaWiki:Gadget-/g, conf.base);
        if (isMainGadget) {
            content = content.replace('AFCH.consts.beta = true;', 'AFCH.consts.beta = false;');
        }
        const editSummary = `Updating AFCH: ${branch} @ ${sha1.slice(0, 6)} ${EDIT_SUMMARY_ADVERT}`

        console.log(`Deploying build/${fileName} to ${pageTitle} ...`);
        const saveResponse = await bot.save(pageTitle, content, editSummary);
        if (saveResponse.nochange) {
            console.log(`\tNo change from edit`);
        } else {
            console.log(`\tSaved ${pageTitle}`);
        }
    }

    console.log(`AFCH uploaded to ${hostname} successfully!`);
})();
