"""
upload.py: build and upload the helper script to a wiki (requires git and either
mwclient or pywikibot, as well as grunt and the associated dependencies in package.json)

(C) 2014 Theopolisme <theopolismewiki@gmail.com>
Modified for Pywikibot by Enterprisey

Usage
=====

Run this script from the main afc-helper directory using Python 3:

>>> python scripts/upload.py SITE ROOT [--force] [--mwclient USERNAME]

SITE: en or test

ROOT: Base page name for the script, without any file extension.  For example,
if "MediaWiki:Gadget-afch" was specified the script can be loaded from
`MediaWiki:Gadget-afch.js`.

force: Flag to indicate that grunt build should be run with --force.
PLEASE don't use this.

mwclient: Flag to indicate that mwclient should be used instead of Pywikibot.
"""
from __future__ import unicode_literals

import argparse
import sys
import os
import git
import subprocess

# Check arg length
if len(sys.argv) < 2:
	print('Incorrect number of arguments supplied.')
	print('Usage: python scripts/upload.py SITE ROOT [--force] [--mwclient USERNAME]')
	sys.exit(1)

using_mwclient = '--mwclient' in sys.argv
if using_mwclient:
	import mwclient
	username_index = sys.argv.index('--mwclient') + 1
	username = sys.argv[username_index]
	del sys.argv[username_index]
	sys.argv.remove('--mwclient')

	import getpass
else:
	import pywikibot

# Shortname of the wiki target
wiki = sys.argv[1]

if wiki not in ('en', 'test'):
	print('Error: unrecognized wiki "{}". Must be "en" or "test".'.format(wiki))
	sys.exit(1)

# Base page name on-wiki
root = sys.argv[2]

if root.endswith('.js'):
    print('Error: root "{}" ends in .js - likely a mistake.'.format(root))
    sys.exit(1)

# First, create a build
command = 'grunt build'

# Should we use --force on grunt build?
if '--force' in sys.argv:
	command += ' --force'
	sys.argv.remove('--force')

print('Building afc-helper using `{}`...'.format(command))

try:
	process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
	output = process.communicate()[0]
	if b'Done' not in output:
		print('The following error occurred during the build, so the upload was aborted:')
		print(output)
		sys.exit(1)
	else:
		print("Build succeeded!")
except OSError:
	print("OSError encountered. Attempting to use os.system...")
	os.system(command)

print('Uploading to {}...'.format(wiki))

# Utility function used in setPageText
def stripFirstLine(text):
	return '\n'.join(text.splitlines()[1:])

# Which of the two bot libraries are we using to write our edits?
if using_mwclient:
	if wiki == 'en':
		server_name = 'en.wikipedia.org'
	else:
		server_name = 'test.wikipedia.org'
	site = mwclient.Site(server_name)
	site.login(username, getpass.getpass('Password for {} on {}: '.format(username, server_name)))
	print('Logged in as {}.'.format(site.username))

	def setPageText(title, text, summary):
		page = site.Pages[title]
		# Only update the page if its contents have changed (excluding the header)
		if stripFirstLine(page.text()) != stripFirstLine(text):
			print('Uploading to {}'.format(title))
			page.save(text, summary=summary)
		else:
			print('Skipping {}, no changes made'.format(title))
else: #pywikibot
	site = pywikibot.Site(wiki, "wikipedia")
	site.login()
	print('Logged in as {}.'.format(site.user()))

	def setPageText(title, text, summary):
		page = pywikibot.Page(site, title=title)
		# Only update the page if its contents have changed (excluding the header)
		if stripFirstLine(page.get()) != stripFirstLine(text):
			print('Uploading to {}'.format(title))
			page.text = text
			page.save(summary=summary)
		else:
			print('Skipping {}, no changes made'.format(title))

# Get branch name and the current commit
repo = git.Repo(os.getcwd())
try:
	branch = repo.active_branch
	sha1 = branch.commit.hexsha
except AttributeError:
	branch = next(x for x in repo.branches if x.name == repo.active_branch)
	sha1 = branch.commit.id

# Prepend this to every page
header = '/* Uploaded from https://github.com/wikimedia-gadgets/afc-helper, commit: {} ({}) */\n'.format(sha1, branch)

isMainGadget = (wiki == 'en') and (root == 'MediaWiki:Gadget-afchelper')

def uploadFile(pagename, content):

	# Add header and update static referencres to root directory
	content = header + content
	content = content.replace('MediaWiki:Gadget-afch',root)
	if isMainGadget:
		content = content.replace('AFCH.consts.beta = true;', 'AFCH.consts.beta = false;')

	setPageText(pagename, content, 'Updating AFCH: {} @ {}'.format(branch, sha1[:6]))

def uploadSubscript(scriptName, content):
	uploadFile(root + '.js/' + scriptName + '.js', content)

def uploadDirectory(directory):
	files = os.listdir(directory)
	for script in files:
		# Skip hidden files and Emacs spam
		if not script.startswith('.') and not script.endswith('~'):
			with open(directory + '/' + script, mode="r", encoding="utf-8") as f:
				content = f.read()
			uploadSubscript(os.path.splitext(script)[0], content)

# Upload afch.js
with open('build/afch.js', mode="r", encoding="utf-8") as f:
	uploadFile(root + '.js', f.read())

# Upload afch.css
with open('build/afch.css', mode="r", encoding="utf-8") as f:
	uploadFile(root + '.css', f.read())

# Now upload everything else: modules, templates
uploadDirectory('build/modules')
uploadDirectory('build/templates')

print('AFCH uploaded to {} successfully!'.format(wiki))
