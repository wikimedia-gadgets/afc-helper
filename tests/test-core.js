/**
 * Tests for src/modules/core.js
 */

/* eslint-env jest */

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
	} );

	it( 'loads all configured modules and their submodules when no type is specified', async () => {
		const originalConsts = AFCH.consts,
			originalScriptFiles = AFCH._scriptFiles,
			originalLoadScripts = AFCH._loadScripts,
			setupSpy = jest.spyOn( AFCH, 'setup' ).mockReturnValue( true ),
			loadScripts = jest.fn( () => $.Deferred().resolve() );

		AFCH.consts = { beta: false };
		AFCH._scriptFiles = {
			modules: {
				submissions: 'submissions.js',
				ffu: 'ffu.js'
			},
			submodules: {
				submissions: [ 'submission-model.js', 'text.js' ]
			}
		};
		AFCH._loadScripts = loadScripts;

		try {
			expect( AFCH.load() ).toBe( true );
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 0 );
			} );

			expect( loadScripts ).toHaveBeenCalledWith( [
				'submission-model.js',
				'text.js',
				'submissions.js',
				'ffu.js'
			] );
		} finally {
			AFCH.consts = originalConsts;
			AFCH._scriptFiles = originalScriptFiles;
			AFCH._loadScripts = originalLoadScripts;
			setupSpy.mockRestore();
		}
	} );
} );
