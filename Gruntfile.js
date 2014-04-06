/*jshint node:true */
module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-jscs-checker' );
	grunt.loadNpmTasks( 'grunt-contrib-less' );
	grunt.loadNpmTasks( 'grunt-contrib-copy');
	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-autoprefixer' );


	grunt.initConfig( {
		copy: {
			build: {
				expand: true,
				cwd: 'src',
				src: [ '**', '!less/*' ],
				dest: 'build'
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
			src: [ 'src/**/*.js' ]
		},

		jscs: {
			src: [ 'src/**/*.js' ]
		}
	} );

	grunt.registerTask(
		'test',
		'Tests files for code style and code quality.',
		[ 'jshint', 'jscs' ]
	);

	grunt.registerTask( 'styling',
		'Compiles LESS files to CSS and minifies them into one file.',
		[ 'less', 'autoprefixer', 'cssmin', 'clean:styling' ]
	);

	grunt.registerTask(
		'build',
		'Tests files, moves them to the /build directory, and minifies CSS.',
		[ 'clean:build', 'test', 'copy', 'styling' ]
	);

	grunt.registerTask( 'default', [ 'build' ] );
};
