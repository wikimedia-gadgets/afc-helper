/**
 * Tests for src/js/core.js
 */

/* eslint-env jest */

describe( 'AFCH.msg', () => {
	it( 'returns a placeholder for missing messages and substitutes every match', () => {
		AFCH.msg.store.coreTestGreeting = 'Hello $name, welcome $name!';

		expect( AFCH.msg.get( 'missingCoreTestMessage' ) ).toBe( '<missingCoreTestMessage>' );
		expect( AFCH.msg.get( 'coreTestGreeting', { $name: 'Alex' } ) )
			.toBe( 'Hello Alex, welcome Alex!' );
	} );

	it( 'sets messages individually or in a batch', () => {
		AFCH.msg.set( 'coreTestSingleMessage', 'Single' );
		AFCH.msg.set( {
			coreTestBatchMessageOne: 'First',
			coreTestBatchMessageTwo: 'Second'
		} );

		expect( AFCH.msg.get( 'coreTestSingleMessage' ) ).toBe( 'Single' );
		expect( AFCH.msg.get( 'coreTestBatchMessageOne' ) ).toBe( 'First' );
		expect( AFCH.msg.get( 'coreTestBatchMessageTwo' ) ).toBe( 'Second' );
	} );
} );

describe( 'AFCH.Views and AFCH.Viewer', () => {
	const originalHogan = global.Hogan;

	beforeAll( () => {
		global.Hogan = require( 'hogan.js' );
	} );

	afterAll( () => {
		global.Hogan = originalHogan;
	} );

	it( 'loads and renders named templates with data', () => {
		const views = new AFCH.Views(
			'<!-- greeting -->\nHello {{name}}!<!-- /greeting -->' +
			'<!-- farewell -->\nGoodbye {{name}}.<!-- /farewell -->'
		);

		expect( views.renderView( 'greeting', { name: 'Alex' } ) ).toBe( 'Hello Alex!' );
		expect( views.renderView( 'farewell', { name: 'Alex' } ) ).toBe( 'Goodbye Alex.' );
	} );

	it( 'restores the previously loaded view', () => {
		const views = new AFCH.Views();
		views.setView( 'first', 'First view' );
		views.setView( 'second', 'Second view' );
		const viewer = new AFCH.Viewer( views, $( '<div>' ).text( 'Initial view' ) );

		viewer.loadView( 'first' );
		viewer.loadView( 'second' );
		expect( viewer.$element.text() ).toBe( 'Second view' );

		viewer.loadPrevious();
		expect( viewer.$element.text() ).toBe( 'First view' );
	} );
} );
