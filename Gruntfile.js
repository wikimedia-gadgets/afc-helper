/*jshint node:true */
module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-jscs' );
	grunt.loadNpmTasks( 'grunt-contrib-less' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-autoprefixer' );
	grunt.loadNpmTasks( 'grunt-exec' );

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
			},
			dependencies: {
				files: {
					'build/modules/core.js': [ 'dependencies/*.js', 'build/modules/core.js' ]
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

		jshint: {
			src: [ 'src/**/*.js', 'misc/**/*.js', '__tests__/**/*.js', ]
		},

		jscs: {
			src: [ 'src/**/*.js', 'misc/**/*.js', '__tests__/**/*.js' ]
		},

		exec: {
			jest: {
				cmd: 'node_modules/.bin/jest'
			}
		}
	} );

	grunt.registerTask(
		'teststyle',
		'Tests files for code style and code quality.',
		[ 'jshint', 'jscs' ]
	);

	grunt.registerTask(
		'test',
		'Runs unit tests as well as checks code style/quality.',
		[ 'teststyle', 'exec:jest' ]
	);

	grunt.registerTask(
		'styling',
		'Compiles LESS files to CSS and minifies them into one file.',
		[ 'less', 'autoprefixer', 'cssmin', 'clean:styling' ]
	);

	grunt.registerTask(
		'build',
		'Tests files, moves them to the /build directory, and minifies CSS.',
		[ 'clean:build', 'test', 'copy', 'concat:dependencies', 'styling' ]
	);

	grunt.registerTask( 'default', [ 'build' ] );
};
