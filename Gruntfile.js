module.exports = function ( grunt ) {
	grunt.initConfig( {
		copy: {
			build: {
				expand: true,
				cwd: 'src',
				src: [ '**', '!less/*' ],
				dest: 'build'
			}
		},

		concat: {
			options: {
				separator: ';',
				banner: '// <nowiki>\n'
			},
			dependencies: {
				files: {
					'build/modules/core.js': [ 'node_modules/hogan.js/build/gh-pages/builds/2.0.0/hogan-2.0.0.js', 'build/modules/core.js' ]
				}
			}
		},

		clean: {
			build: {
				src: [ 'build' ]
			}
		},

		less: {
			build: {
				files: {
					'build/afch.css': [ 'src/less/general.less', 'src/less/submissions.less' ]
				}
			}
		}

	} );

	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-less' );

	grunt.registerTask(
		'build',
		'Moves files to the /build directory, and minifies CSS.',
		[ 'clean:build', 'copy', 'concat:dependencies', 'less' ]
	);

	grunt.registerTask( 'default', [ 'build' ] );
};
