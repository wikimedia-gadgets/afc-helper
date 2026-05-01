/* eslint-env node */

module.exports = {
	setupFilesAfterEnv: [ '<rootDir>/jest.setup.js' ],
	testEnvironment: 'jsdom',
	testMatch: [
		'**/tests/**/test-*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[jt]s?(x)'
	]
};
