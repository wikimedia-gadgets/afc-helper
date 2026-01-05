/**
 * This script sets up the DOM, loads and mocks a few commonly
 * used tools, and creates helper functions that supplement
 * the actual tests themselves.
 */

/* eslint-env jest, node */

inUnitTestEnvironment = true;

window.AFCH = {};

require( './src/afch.js' );
require( './src/modules/core.js' );
require( './src/modules/submissions.js' );
