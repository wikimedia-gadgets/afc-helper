// https://jestjs.io/docs/configuration

module.exports = {
	testEnvironment: 'jsdom',
	testMatch: [
		'**/tests/**/test-*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[jt]s?(x)'
	]
};
