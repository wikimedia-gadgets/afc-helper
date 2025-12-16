// https://jestjs.io/docs/configuration

module.exports = {
	setupFiles: [ '<rootDir>/jest.setup.js' ],
	testEnvironment: 'jsdom',
	testMatch: [
		'**/tests/**/test-*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[jt]s?(x)'
	]
};
