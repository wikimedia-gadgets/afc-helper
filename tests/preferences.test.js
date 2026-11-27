/**
 * Tests for src/js/preferences.js
 */

/* eslint-env jest */

describe( 'AFCH.Preferences', () => {
	it( 'enables AfC logging by default but respects a saved preference', () => {
		const get = jest.spyOn( AFCH.userData, 'get' );
		try {
			get.mockReturnValue( {} );
			expect( new AFCH.Preferences().prefStore.logAfc ).toBe( true );

			get.mockReturnValue( { logAfc: false } );
			expect( new AFCH.Preferences().prefStore.logAfc ).toBe( false );
		} finally {
			jest.restoreAllMocks();
		}
	} );

	it( 'requests the preferences template at its deployed page name', () => {
		const originalSpinner = $.createSpinner,
			originalDialog = $.fn.dialog;
		$.createSpinner = () => $( '<div>' );
		$.fn.dialog = function () {
			return this;
		};
		jest.spyOn( AFCH.userData, 'get' ).mockReturnValue( {} );
		const ajax = jest.spyOn( $, 'ajax' ).mockReturnValue( $.Deferred() );

		try {
			new AFCH.Preferences().initDialog();
			expect( ajax ).toHaveBeenCalledWith( expect.objectContaining( {
				url: expect.stringContaining( 'title=MediaWiki:Gadget-afchelper-tpl-preferences.js' ),
				dataType: 'text'
			} ) );
		} finally {
			jest.restoreAllMocks();
			$.createSpinner = originalSpinner;
			$.fn.dialog = originalDialog;
		}
	} );
} );
