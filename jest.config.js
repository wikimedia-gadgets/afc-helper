// https://jestjs.io/docs/configuration

module.exports = {
	setupFiles: [
		'mock-mediawiki',
		'<rootDir>/jest.setup.js'
	],
	testEnvironment: 'jsdom'
};
