/*jshint node:true */
module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-jscs-checker' );

	grunt.initConfig( {
		jshint: {
			src: [ 'src/**/*.js' ]
		},
		jscs: {
			src: [ 'src/**/*.js' ]
		}
	} );

	grunt.registerTask( 'test', [ 'jshint', 'jscs' ] );
	grunt.registerTask( 'default', [ 'test' ] );
};
