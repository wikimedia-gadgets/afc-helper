/**
 * Tests for src/js/core-utils.js
 */

/* eslint-env jest */

describe( 'AFCH.getAndDelete', () => {
	it( 'returns the property value and removes the property', () => {
		const object = { value: 'stored' };

		expect( AFCH.getAndDelete( object, 'value' ) ).toBe( 'stored' );
		expect( object ).toEqual( {} );
	} );
} );

describe( 'AFCH.removeFromArray', () => {
	it( 'removes every matching value and preserves other values', () => {
		const values = [ 'keep', 'remove', 'remove', 'also keep' ];

		AFCH.removeFromArray( values, 'remove' );

		expect( values ).toEqual( [ 'keep', 'also keep' ] );
	} );
} );

describe( 'AFCH.getFormValues', () => {
	it( 'returns checkbox state and selected values and labels', () => {
		const $checkbox = $( '<input>' ).attr( 'type', 'checkbox' ).attr( 'id', 'enabled' ).prop( 'checked', true ),
			$select = $( '<select>' ).attr( 'id', 'status' )
				.append( $( '<option>' ).val( 'draft' ).text( 'Draft' ).prop( 'selected', true ) )
				.append( $( '<option>' ).val( 'submitted' ).text( 'Submitted' ) ),
			$form = $( '<div>' ).append( $checkbox, $select );

		expect( AFCH.getFormValues( $form.find( 'input, select' ) ) ).toEqual( {
			enabled: true,
			status: 'draft',
			statusTexts: [ 'Draft' ]
		} );
	} );
} );
