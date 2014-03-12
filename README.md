afch-rewrite [![Build Status](https://travis-ci.org/WPAFC/afch-rewrite.png)](https://travis-ci.org/WPAFC/afch-rewrite)
============

**v0.3 Excited Murmur**

A tool for reviewing Articles for Creation submissions on the English Wikipedia, rewritten using clear, object-oriented JavaScript with a focus on killing bloat while adding value.

Currently mainly being developed by [@theopolisme](https://github.com/theopolisme).

### Using

On testwiki, [MediaWiki:Gadget-afch.js](https://test.wikipedia.org/wiki/MediaWiki:Gadget-afch.js) is an updated copy of the script used for development purposes.

Feel free to give it a run by adding `importScript('MediaWiki:Gadget-afch.js')` to your [common.js](https://test.wikipedia.org/wiki/Special:MyPage/common.js) page there, but bear in mind that the rewrite is still alpha software.

### Contributing

Your contributions are welcome! Please add feature requests and bug reports as new issues.

If you'd like to contribute directly to the code, that's great too! In order to maintain great code quality, please submit significant changes using pull requests so that a consistent code style can be maintained throughout the project.

**Protip for developers**: Set `AFCH.consts.mockItUp = true;` using your browser console and instead of making API requests which modify wiki content, the script will log what it *would have done* instead.

### Version history

* 0.3 Excited Murmur (12 March 2014)
* 0.2 Egalitarian Elephant (27 February 2014)
* 0.1 Exploding Fireball (4 January 2014)

### License

`afch-rewrite` is licensed under the GNU General Public License version 3; see LICENSE for more information.
