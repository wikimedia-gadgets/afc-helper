/**
 * Tests for src/js/submission-actions.js
 */

/* eslint-env jest */

describe( 'AFCH.SubmissionActions', () => {
	it( 'updates the submitter and writes the submission text', () => {
		const page = { edit: jest.fn() },
			submission = {
				setStatus: jest.fn(),
				makeWikicode: jest.fn( () => 'updated template' )
			},
			text = {
				updateAfcTemplates: jest.fn(),
				cleanUp: jest.fn(),
				get: jest.fn( () => 'updated wikitext' )
			},
			actions = new AFCH.SubmissionActions( {
				$afch: $( '<div>' ),
				page: page,
				submission: submission,
				prepareForProcessing: jest.fn()
			} );

		actions.handleSubmit( {
			afchText: text,
			submitType: 'other',
			submitterName: 'Author'
		} );

		expect( submission.setStatus ).toHaveBeenCalledWith( '', { u: 'Author' } );
		expect( text.updateAfcTemplates ).toHaveBeenCalledWith( 'updated template' );
		expect( text.cleanUp ).toHaveBeenCalledTimes( 1 );
		expect( page.edit ).toHaveBeenCalledWith( {
			contents: 'updated wikitext',
			summary: 'Submitting'
		} );
	} );
} );
