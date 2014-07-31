"""
upload.py: build and upload the helper script to a wiki (requires mwclient
and git, as well as grunt and the associated dependencies in package.json)

(C) 2014 Theopolisme <theopolismewiki@gmail.com>

Usage
=====

Run from the main afch-rewrite directory:

>>> python scripts/upload.py [site] [root] [username] [password]

site: enwiki or testwiki

root: Base page name for the script, without any file extension.
      For example, if "MediaWiki:Gadget-afch" was specified the
      script can be loaded from `MediaWiki:Gadget-afch.js`.

username: username of account on site
password: password of account on site (optional)
"""
from __future__ import unicode_literals

import sys
import os
import git
import mwclient
import subprocess
import getpass

# Check arg length
if(len(sys.argv) < 4):
	print "Incorrect number of arguments supplied."
	print "Usage: python scripts/upload.py [site] [root] [username] [password]"
	sys.exit(1)

# Shortname of the wiki target
wiki = sys.argv[1]

# First, create a build
print 'Building afch-rewrite using `grunt build`...'
command = 'grunt build'
check_output = True # Do we check the output of grunt build?
	
try:
	process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
	output = process.communicate()[0]
except WindowsError:
	print "WindowsError encountered. Attempting to use os.system..."
	os.system(command)
	
	# There's no way to check the output of os.system
	check_output = False

if check_output and output.decode('utf-8').find('Done, without errors.') == -1:
	print 'The following error occurred during the build, so the upload was aborted:'
	print output
	sys.exit(1)
else:
	print 'Build ' + ('hopefully ' if not check_output else '') + 'succeeded. Uploading to {}...'.format(wiki)

if wiki == 'enwiki':
	site = mwclient.Site('en.wikipedia.org')
elif wiki == 'testwiki':
	site = mwclient.Site('test.wikipedia.org')
else:
	print 'Error: unrecognized wiki "{}". Must be "enwiki" or "testwiki".'.format(wiki)
	sys.exit(0)

# Login with username and password
site.login(sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else getpass.getpass())

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
	page = site.Pages[pagename]

	# Add header and update static referencres to root directory
	content = header + content.decode('utf-8')
	content = content.replace('MediaWiki:Gadget-afch',root)

	def stripFirstLine(text):
		return '\n'.join(text.splitlines()[1:])

	# Only update the page if its contents have changed (excluding the header)
	if stripFirstLine(content) != stripFirstLine(page.edit()):
		print 'Uploading to {}'.format(pagename)
		page.save(content, 'Updating AFCH: {} @ {}'.format(branch, sha1[:6]))
	else:
		print 'Skipping {}, no changes made'.format(pagename)

def uploadSubscript(scriptName, content):
	uploadFile(root + '.js/' + scriptName + '.js', content)

def uploadDirectory(directory):
	files = os.listdir(directory)
	for script in files:
		# Skip hidden files
		if not script.startswith('.'):
			with open(directory + '/' + script, 'r') as f:
				content = f.read()
			uploadSubscript(os.path.splitext(script)[0], content)

# Upload afch.js
with open('build/afch.js', 'r') as f:
	uploadFile(root + '.js', f.read())

# Upload afch.css
with open('build/afch.css', 'r') as f:
	uploadFile(root + '.css', f.read())

# Now upload everything else: modules, templates, dependencies
uploadDirectory('build/modules')
uploadDirectory('build/templates')
uploadDirectory('dependencies')

print 'AFCH uploaded to {} successfully!'.format(wiki)
