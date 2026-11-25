/**
 * Tests for Gruntfile.js
 */

/* eslint-env jest, node */

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

it( 'builds Hogan separately from core', () => {
	const root = path.join( __dirname, '..' ),
		output = fs.mkdtempSync( path.join( os.tmpdir(), 'afch-build-test-' ) ),
		script = `
			const grunt = require( 'grunt' );
			const path = require( 'path' );
			require( './Gruntfile' )( grunt );
			const output = process.argv[ 1 ];
			const lessSources = grunt.config.get( 'less.build.files' )[ 'build/afch.css' ];
			grunt.config.set( 'clean.build.src', [] );
			grunt.config.set( 'copy.build.dest', output );
			grunt.config.set( 'copy.dependencies.dest', path.join( output, 'js', 'hogan.js' ) );
			grunt.config.set( 'less.build.files', { [ path.join( output, 'afch.css' ) ]: lessSources } );
			grunt.tasks( [ 'build' ], { gruntfile: false } );
		`;

	try {
		execFileSync( process.execPath, [ '-e', script, output ], { cwd: root } );
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		expect( fs.readFileSync( path.join( output, 'js', 'core.js' ) ) )
			.toEqual( fs.readFileSync( path.join( root, 'src', 'js', 'core.js' ) ) );
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		expect( fs.readFileSync( path.join( output, 'js', 'hogan.js' ) ) )
			.toEqual( fs.readFileSync( path.join( root, 'node_modules', 'hogan.js', 'build', 'gh-pages', 'builds', '2.0.0', 'hogan-2.0.0.js' ) ) );
	} finally {
		fs.rmSync( output, { recursive: true, force: true } );
	}
} );
