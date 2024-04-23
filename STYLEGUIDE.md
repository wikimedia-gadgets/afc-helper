Style guide
===========

For the most part, we follow [MediaWiki coding conventions](https://www.mediawiki.org/wiki/Manual:Coding_conventions/JavaScript). Code should validate with ESLint (see configuration in `.eslintrc.json`). GitHub Actions is used to ensure consistent code style/quality; unit tests and linting are run on all commits and pull requests.

## Tips
 * _**TABS!**_
 * Comments are great; intelligent comments are even better.
 * Avoid assembling complex DOM structures in JavaScript. Instead, use a hogan template and `AFCH.Views` to access/populate/generate it.
