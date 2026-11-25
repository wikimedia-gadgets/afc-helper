/**
 * Tests for src/js/core.js
 */

/* eslint-env jest */

// It's always good to start simple :)
describe( 'AFCH', () => {
	it( 'is an object', () => {
		expect( typeof AFCH ).toBe( 'object' );
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
