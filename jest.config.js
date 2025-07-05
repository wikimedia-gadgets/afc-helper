// https://jestjs.io/docs/configuration

const config = {
	testEnvironment: 'jsdom',
	testMatch: [
		'**/tests/**/test-*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[jt]s?(x)'
	]
};

// Check whether we're running on gadget-deploy.toolforge.org
if (process.env.IN_DEPLOY_SERVICE) {
	config.maxWorkers = 1;
}

module.exports = config;
