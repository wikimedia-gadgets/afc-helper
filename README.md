afc-helper [![Build Status](https://github.com/wikimedia-gadgets/afc-helper/actions/workflows/unit_tests.yml/badge.svg)]
============

A tool for reviewing Articles for Creation submissions on the English Wikipedia, rewritten using clear, object-oriented JavaScript with a focus on killing bloat while adding value.

### Using
The script can be installed on the English Wikipedia by following the instructions at [WP:AFCH](https://en.wikipedia.org/wiki/WP:AFCH).

### Contributing
*Looking for detailed instructions about how to contribute to afc-helper? Check out the [Contributing](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Articles_for_creation/Helper_script/Contributing) page on Wikipedia!*

Your contributions are welcome! Please add feature requests and bug reports to [WT:AFCH](https://en.wikipedia.org/wiki/WT:AFCH) on enwiki to keep discussions centralized; GitHub also works.

If you'd like to contribute directly to the code, that's great too! In order to maintain great code quality, please submit significant changes using pull requests so that a consistent code style can be maintained throughout the project.

To serve the script locally for development, use `npm start` and follow the instructions. The [Contributing](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Articles_for_creation/Helper_script/Contributing) page has more details if you get stuck.

**Protip for developers**: AFCH running using `npm start` will run in silent mode by default. That is, it will not edit any pages, but instead will output API queries to your browser console. To turn this off, add `window.afchSuppressDevEdits = false;` to your common.js file, or open a browser console and type `AFCH.consts.mockItUp = false;`

### Testing
We have unit tests! `afc-helper` uses [Jest](https://github.com/facebook/jest) for testing, a framework built on top of Jasmine that offers dead-simple mocking, built-in simulated DOM manipulation using [jsdom](https://github.com/tmpvar/jsdom), and more.

Tests are stored in the `tests` directory and are run automatically on new commits via GitHub Actions.

### Deploying
Interface administrators can [click here](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Articles_for_creation/Helper_script/Deploying) for a detailed work instruction of how to deploy to English Wikipedia.

To deploy AFC Helper to a wiki, use `scripts/upload.py`.

### Dependencies
Below is a list of dependencies and what they are involved with, so you know what to test when updating dependencies.

* Regular
  * hogan.js - HTML template framework. Creates code that ends up on-wiki.
* Dev Only
  * eslint - Used by CI and code editor
  * grunt - Used by CI and `npm start`
  * jest-cli - Used by CI and unit tests
  * jquery - Used by CI and unit tests

### License

`afc-helper` is licensed under the GNU General Public License version 3; see LICENSE for more information.
