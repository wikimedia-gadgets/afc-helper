afch-rewrite [![Build Status](https://travis-ci.org/WPAFC/afch-rewrite.png)](https://travis-ci.org/WPAFC/afch-rewrite)
============

**v0.9 Hatted Hamster**

A tool for reviewing Articles for Creation submissions on the English Wikipedia, rewritten using clear, object-oriented JavaScript with a focus on killing bloat while adding value.

Currently mainly being developed by [@theopolisme](https://github.com/theopolisme).

### Using

The script can be installed on the English Wikipedia by following the instructions at [WP:AFCH](https://en.wikipedia.org/wiki/WP:AFCH).

### Contributing

*Looking for detailed instructions about how to contribute to the afch-rewrite source code? Check out the [Getting Started](https://github.com/WPAFC/afch-rewrite/wiki/Getting-started) article on the wiki!*

Your contributions are welcome! Please add feature requests and bug reports to [WT:AFCH](https://en.wikipedia.org/wiki/WT:AFCH) on enwiki to keep discussions centralized.

If you'd like to contribute directly to the code, that's great too! In order to maintain great code quality, please submit significant changes using pull requests so that a consistent code style can be maintained throughout the project.

**Protip for developers**: Set `AFCH.consts.mockItUp = true;` using your browser console and instead of making API requests which modify wiki content, the script will log what it *would have done* instead.

### Testing
We have unit tests! `afch-rewrite` uses [Jest](https://github.com/facebook/jest) for testing, a framework built on top of Jasmine that offers dead-simple mocking, built-in simulated DOM manipulation using [jsdom](https://github.com/tmpvar/jsdom), and more.

Tests are stored in the `__tests__` directory and are run automatically on new commits via Travis.

### Uploading and releasing the script
To upload the script to a wiki, use `scripts/upload.py`. Detailed instructions are included at the top of the file.

New versions of the script can be released through `scripts/release.py`, which automatically updates version history, inline version constants, `package.json`, etc.

### Version history

* 0.9 Hatted Hamster (8 Novemeber 2014)
* 0.8 Wandering Walrus (18 May 2014)
* 0.7 Less is More (13 April 2014)
* 0.6 Dancing Turtle (27 March 2014)
* 0.5 Cold Moose (21 March 2014)
* 0.4 Rewired Robot (14 March 2014)
* 0.3 Excited Murmur (12 March 2014)
* 0.2 Egalitarian Elephant (27 February 2014)
* 0.1 Exploding Fireball (4 January 2014)

### License

`afch-rewrite` is licensed under the GNU General Public License version 3; see LICENSE for more information.
