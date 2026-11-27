/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

inUnitTestEnvironment = true;

window.AFCH = {};

require( './src/afch.js' );
require( './src/js/core.js' );
require( './src/js/page.js' );
require( './src/js/api-actions.js' );
require( './src/js/core-utils.js' );
require( './src/js/wikitext-utils.js' );
require( './src/js/preferences.js' );
require( './src/js/submission-model.js' );
require( './src/js/submission-text.js' );
require( './src/js/submission-warnings.js' );
require( './src/js/submission-forms.js' );
require( './src/js/submissions.js' );
