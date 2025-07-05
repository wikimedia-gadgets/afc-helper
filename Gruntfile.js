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
			},
			styling: {
				src: [ 'build/less' ]
			}
		},

		less: {
			options: {
				cleancss: true
			},
			files: {
				expand: true,
				cwd: 'src',
				src: [ 'less/*.less' ],
				dest: 'build',
				ext: '.css'
			}
		},

		autoprefixer: {
			build: {
				expand: true,
				cwd: 'build',
				src: [ '**/*.css' ],
				dest: 'build'
			}
		},

		cssmin: {
			build: {
				files: {
					'build/afch.css': [ 'build/**/*.css' ]
				}
			}
		},

		eslint: {
			target: [ 'src/**/*.js', 'contrib/**/*.js', 'tests/**/*.js', 'Gruntfile.js' ]
		},
	} );

	grunt.loadNpmTasks( 'grunt-autoprefixer' );
	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-contrib-less' );
	grunt.loadNpmTasks( 'grunt-eslint' );

	grunt.registerTask(
		'lint',
		'Tests files for code style and code quality.',
		[ 'eslint' ]
	);

	grunt.registerTask(
		'styling',
		'Compiles LESS files to CSS and minifies them into one file.',
		[ 'less', 'autoprefixer', 'cssmin', 'clean:styling' ]
	);

	grunt.registerTask(
		'build',
		'Moves files to the /build directory, and minifies CSS.',
		[ 'clean:build', 'lint', 'copy', 'concat:dependencies', 'styling' ]
	);

	grunt.registerTask( 'default', [ 'build' ] );
};
