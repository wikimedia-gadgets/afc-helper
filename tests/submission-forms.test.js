/**
 * Tests for src/js/submission-forms.js
 */

/* eslint-env jest */

describe( 'AFCH.SubmissionForms', () => {
	it( 'loads the comment form and submits its input data', async () => {
		document.body.innerHTML = '';
		const $submitButton = $( '<button>' ).attr( 'id', 'afchSubmitForm' ),
			$input = $( '<input>' ).attr( 'id', 'commentExtra' ).addClass( 'afch-input' ).val( 'test value' ),
			$panel = $( '<div>' ).append( $submitButton, $input ).appendTo( document.body ),
			page = { getText: jest.fn( () => $.Deferred().resolve( 'Draft text' ) ) },
			loadView = jest.fn(),
			prepareForProcessing = jest.fn(),
			checkForEditConflict = jest.fn( () => $.Deferred().resolve( false ) ),
			handleComment = jest.fn(),
			forms = new AFCH.SubmissionForms( {
				$afch: $panel,
				page: page,
				submission: { submitters: [] },
				loadView: loadView,
				prepareForProcessing: prepareForProcessing,
				checkForEditConflict: checkForEditConflict,
				showEditConflictMessage: jest.fn(),
				handleAccept: jest.fn(),
				handleAcceptOverRedirect: jest.fn(),
				handleDecline: jest.fn(),
				handleComment: handleComment,
				handleSubmit: jest.fn(),
				handlePostponeG13: jest.fn()
			} );

		forms.showCommentOptions();
		expect( loadView ).toHaveBeenCalledWith( 'comment', {} );
		expect( $submitButton.css( 'display' ) ).toBe( 'none' );

		$submitButton.trigger( 'click' );
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );

		expect( prepareForProcessing ).toHaveBeenCalledTimes( 1 );
		expect( handleComment ).toHaveBeenCalledWith( expect.objectContaining( {
			afchText: expect.any( AFCH.Text ),
			commentExtra: 'test value'
		} ) );
	} );
} );
