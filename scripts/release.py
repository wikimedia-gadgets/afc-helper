"""
release.py: release a new version of afch-rewrite. Updates files,
commits them, adds a new tag in git, and uploads it all to the remote.

(C) 2014 Theopolisme <theopolismewiki@gmail.com>

Usage
=====

Run from the main afch-rewrite directory and follow instructions:

>>> python scripts/release.py
"""
import re
import subprocess
import datetime

def execute_command(command):
	"""Execute a shell command and return its output."""
	process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
	output = process.communicate()[0]
	return output

def update_file(filename,find,replace):
	"""Execute a regex substitution on the contents of a file
	and save it with the updated contents.
	"""
	with open(filename,'r') as f:
		text = f.read()
		text = re.sub(find,replace,text)
	with open(filename,'w') as f:
		f.write(text)

def full_version(version):
	"""Convert a shorthand version number (e.g. "0.2") to
	the complete version format ("0.2.0")."""
	version = str(version)
	pts = version.count('.')
	while pts < 2:
		version += '.0'
		pts = version.count('.')
	return version

# Prompt user for information and show warnings

with open('README.md') as f:
	text = f.read()
	current_version = re.search(r'\n\*\*v(.*?)\*\*',text).group(1)

print("Ready to release AFCH (current version: {})...".format(current_version))

if execute_command('git diff') != '':
	print('** There are other uncommited changes in your working branch.')
	print('** If you continue, these changes will be commited in the release commit.')

version = input('Version number > ')
version_name = input('Version name > ')

# Update src/afch.js

update_file('src/afch.js',
	r'AFCH\.consts\.version = .*?;',"AFCH.consts.version = '{}';".format(version))

update_file('src/afch.js',
	r'AFCH\.consts\.versionName = .*?;',"AFCH.consts.versionName  = '{}';".format(version_name))

# Update README.md

current_date = datetime.datetime.now().strftime('%d %B %Y')

update_file('README.md',
	r'### Version history\n\n','### Version history\n\n* {} {} ({})\n'.format(version,version_name,current_date))

update_file('README.md',
	r'\n\n\*\*v.*?\*\*','\n\n**v{} {}**'.format(version,version_name))

# Update package.json

update_file('package.json',
	r'"version": ".*?",','"version": "{}",'.format(full_version(version)))

# Commit the release
execute_command('git add .')
execute_command('git commit -m v{}'.format(version))

# Tag the new version
execute_command('git tag v{}'.format(version))

# Push to master
execute_command('git push origin master')
execute_command('git push origin master --tags')
