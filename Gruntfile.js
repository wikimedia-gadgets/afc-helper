/*jshint node:true */
module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );

	grunt.initConfig({
		jshint: {
			all: ['*.js']
		}
	});

	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('default', ['test']);
};
