/**
 * Tests for src/js/submissions.js
 */

/* eslint-env jest, node */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'decline and reject notifications', () => {
	let originalSubmission, OriginalPage, originalFlag, originalHogan, originalChosen, originalSpinner,
		originalConsts, originalPrefs, originalPreferences, originalApi, editPage, getCategories;

	beforeEach( () => {
		originalSubmission = AFCH.Submission;
		OriginalPage = AFCH.Page;
		originalFlag = inUnitTestEnvironment;
		originalHogan = global.Hogan;
		originalChosen = $.fn.chosen;
		originalSpinner = $.createSpinner;
		originalConsts = AFCH.consts;
		originalPrefs = AFCH.prefs;
		originalPreferences = AFCH.preferences;
		originalApi = AFCH.api;
		inUnitTestEnvironment = undefined;
		global.Hogan = require( 'hogan.js' );
		$.fn.chosen = function () {
			return this;
		};
		$.createSpinner = () => $( '<div>' );

		document.body.innerHTML = '<div id="mw-content-text"></div>';
		AFCH.consts = { pagename: 'Draft:Example', user: 'Reviewer', baseurl: '' };
		AFCH.prefs = { autoOpen: false };
		AFCH.preferences = { initLink: jest.fn() };
		AFCH.api = { get: jest.fn() };
		editPage = jest.fn();
		getCategories = jest.fn( () => $.Deferred().resolve( [] ) );
		AFCH.Page = function ( title ) {
			const page = new OriginalPage( title );
			page.getText = () => $.Deferred().resolve( '{{AfC submission||u=Author}}' );
			page.getCategories = getCategories;
			page.exists = () => $.Deferred().resolve( true );
			page.edit = ( options ) => {
				editPage( page.rawTitle, options );
				return $.Deferred().resolve();
			};
			return page;
		};
		jest.spyOn( mw.util, 'addPortletLink' ).mockImplementation( () => $( '<a>' ).attr( 'id', 'afch-launch' ).appendTo( document.body )[ 0 ] );
		const getConfig = mw.config.get.bind( mw.config );
		jest.spyOn( mw.config, 'get' ).mockImplementation( ( key ) => {
			const values = {
				wgArticleId: 1,
				wgPageContentModel: 'wikitext',
				wgNamespaceNumber: 118,
				wgCurRevisionId: 1,
				wgPageName: 'Draft:Example'
			};
			return Object.prototype.hasOwnProperty.call( values, key ) ? values[ key ] : getConfig( key );
		} );

		jest.isolateModules( () => {
			require( '../src/js/submissions.js' );
		} );

		jest.spyOn( AFCH.Submission.prototype, 'parse' ).mockImplementation( function () {
			this.templates = [ { status: '', timestamp: '20240101000000', params: { u: 'Author' } } ];
			this.sortAndParseInternalData();
			return $.Deferred().resolve( this );
		} );
		jest.spyOn( AFCH.Submission.prototype, 'getSubmitter' ).mockImplementation( () => $.Deferred().resolve( 'Author' ) );
		jest.spyOn( AFCH.userData, 'get' ).mockImplementation( ( key, fallback ) => fallback );
		jest.spyOn( AFCH.userData, 'set' ).mockImplementation( () => $.Deferred().resolve() );
		jest.spyOn( AFCH.actions, 'logAfc' ).mockImplementation( () => {} );
		jest.spyOn( AFCH.actions, 'logCSD' ).mockImplementation( () => {} );
		jest.spyOn( AFCH.status, 'init' ).mockImplementation( () => {} );
		AFCH.api.get.mockImplementation( ( params ) => {
			if ( params.revids ) {
				return $.Deferred().resolve( { query: { pages: [ { revisions: [ { timestamp: '2024-01-01T00:00:00Z' } ] } ] } } );
			}
			if ( params.rvstart ) {
				return $.Deferred().resolve( { query: { pages: [ {} ] } } );
			}
			return $.Deferred();
		} );
		jest.spyOn( $, 'ajax' ).mockImplementation( () => $.Deferred().resolve(
			fs.readFileSync( path.join( __dirname, '..', 'src', 'templates', 'tpl-submissions.html' ), 'utf8' )
		) );
	} );

	afterEach( () => {
		$( document ).off( 'ajaxStop' );
		jest.restoreAllMocks();
		AFCH.Submission = originalSubmission;
		AFCH.Page = OriginalPage;
		AFCH.consts = originalConsts;
		AFCH.prefs = originalPrefs;
		AFCH.preferences = originalPreferences;
		AFCH.api = originalApi;
		inUnitTestEnvironment = originalFlag;
		global.Hogan = originalHogan;
		$.fn.chosen = originalChosen;
		$.createSpinner = originalSpinner;
	} );

	async function waitFor( predicate ) {
		for ( let i = 0; i < 100; i++ ) {
			if ( predicate() ) {
				return;
			}
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 10 );
			} );
		}
		throw new Error( 'Timed out waiting for the review form' );
	}

	it.each( [
		[ 'decline', false ],
		[ 'decline', true ],
		[ 'reject', false ],
		[ 'reject', true ]
	] )( '%s with notify=%s respects the selected checkbox', async ( action, notify ) => {
		$( '#afch-launch' ).trigger( 'click' );
		await waitFor( () => $( '#afchDecline' ).length );
		$( '#afchDecline' ).trigger( 'click' );
		await waitFor( () => $( '#declineNotifyUser' ).length );

		$( '#declineReason' ).val( [ 'bio' ] ).trigger( 'change' );
		$( '#rejectReason' ).val( [ 'n' ] ).trigger( 'change' );
		if ( action === 'reject' ) {
			$( '#declineRejectReject' ).trigger( 'click' );
		}
		$( '#declineNotifyUser' ).prop( 'checked', action === 'decline' ? notify : !notify );
		$( '#rejectNotifyUser' ).prop( 'checked', action === 'reject' ? notify : !notify );
		$( '#csdSubmission' ).prop( 'checked', true );
		$( '#afchSubmitForm' ).trigger( 'click' );

		await waitFor( () => AFCH.actions.logCSD.mock.calls.length );
		if ( notify ) {
			await waitFor( () => editPage.mock.calls.length === 2 );
		} else {
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 30 );
			} );
		}
		const editedTitles = editPage.mock.calls.map( ( call ) => call[ 0 ] );
		expect( editedTitles ).toEqual( notify ? [ 'Draft:Example', 'User talk:Author' ] : [ 'Draft:Example' ] );
		expect( getCategories ).toHaveBeenCalledTimes( notify && action === 'decline' ? 1 : 0 );
		if ( notify ) {
			expect( editPage.mock.calls[ 1 ][ 1 ].contents ).toContain( action === 'decline' ? 'Afc decline' : 'Afc reject' );
			expect( editPage.mock.calls[ 1 ][ 1 ].contents.includes( 'Teahouse/AfC invitation' ) ).toBe( action === 'decline' );
		}
		expect( AFCH.actions.logCSD ).toHaveBeenCalledWith( expect.objectContaining( {
			usersNotified: notify ? [ 'Author' ] : []
		} ) );
	} );
} );
