"""
upload.py: build and upload the helper script to a wiki (requires pywikibot
and git, as well as grunt and the associated dependencies in package.json)

(C) 2014 Theopolisme <theopolismewiki@gmail.com>
Modified for Pywikibot by Enterprisey

Usage
=====

Run this script from the main afch-rewrite directory using Python 3:

>>> python scripts/upload.py [site] [root] [--force]

site: en or test

root: Base page name for the script, without any file extension.  For example,
if "MediaWiki:Gadget-afch" was specified the script can be loaded from
`MediaWiki:Gadget-afch.js`.

force: Flag to indicate that grunt build should be run with --force.
PLEASE don't use this.
"""
from __future__ import unicode_literals

import sys
import os
import git
import pywikibot
import subprocess

# Check arg length
if len(sys.argv) < 2:
	print('Incorrect number of arguments supplied.')
	print('Usage: python scripts/upload.py [site] [root] [--force]')
	sys.exit(1)

# Shortname of the wiki target
wiki = sys.argv[1]

if wiki not in ('en', 'test'):
	print('Error: unrecognized wiki "{}". Must be "en" or "test".'.format(wiki))
	sys.exit(0)

# First, create a build
command = 'grunt build'

# Should we use --force on grunt build?
if '--force' in sys.argv:
	command += ' --force'
	sys.argv.remove('--force')

print('Building afch-rewrite using `{}`...'.format(command))

try:
	process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
	output = process.communicate()[0]
	if b'Done.' not in output:
		print('The following error occurred during the build, so the upload was aborted:')
		print(output)
		sys.exit(1)
	else:
		print("Build succeeded!")
except OSError:
	print("OSError encountered. Attempting to use os.system...")
	os.system(command)

print('Uploading to {}...'.format(wiki))

site = pywikibot.Site(wiki, "wikipedia")
site.login()
print('Logged in as {}.'.format(site.user()))

# Base page name on-wiki
root = sys.argv[2]

# Get branch name and the current commit
repo = git.Repo(os.getcwd())
try:
	branch = repo.active_branch
	sha1 = branch.commit.hexsha
except AttributeError:
	branch = next(x for x in repo.branches if x.name == repo.active_branch)
	sha1 = branch.commit.id

# Prepend this to every page
header = '/* Uploaded from https://github.com/WPAFC/afch-rewrite, commit: {} ({}) */\n'.format(sha1, branch)

def uploadFile(pagename, content):
	page = pywikibot.Page(site, title=pagename)
	content = page.get()

	# Add header and update static referencres to root directory
	content = header + content
	content = content.replace('MediaWiki:Gadget-afch',root)

	def stripFirstLine(text):
		return '\n'.join(text.splitlines()[1:])

	# Only update the page if its contents have changed (excluding the header)
	if stripFirstLine(content) != stripFirstLine(page.get()):
		print('Uploading to {}'.format(pagename))
		page.text = content
		page.save(summary='Updating AFCH: {} @ {}'.format(branch, sha1[:6]))
	else:
		print('Skipping {}, no changes made'.format(pagename))

def uploadSubscript(scriptName, content):
	uploadFile(root + '.js/' + scriptName + '.js', content)

def uploadDirectory(directory):
	files = os.listdir(directory)
	for script in files:
		# Skip hidden files and Emacs spam
		if not script.startswith('.') and not script.endswith('~'):
			with open(directory + '/' + script, 'r') as f:
				content = f.read()
			uploadSubscript(os.path.splitext(script)[0], content)

# Upload afch.js
with open('build/afch.js', 'r') as f:
	uploadFile(root + '.js', f.read())

# Upload afch.css
with open('build/afch.css', 'r') as f:
	uploadFile(root + '.css', f.read())

# Now upload everything else: modules, templates
uploadDirectory('build/modules')
uploadDirectory('build/templates')

print('AFCH uploaded to {} successfully!'.format(wiki))
