//<nowiki>
// Script should be located at [[MediaWiki:Gadget-afchelper.js/submissions.js]]
( function ( AFCH, $, mw ) {
	var $afchReviewPanel,
		thePage,
		theSubmission;

	/**
	 * Represents an AfC submission and its status. Call submission.parse() to
	 * actually get the data.
	 *
	 * @param {AFCH.Page} page The submission page
	 */
	AFCH.Submission = function ( page ) {
		// The associated page
		this.page = page;

		// Various submission states, set in parse()
		this.isPending = false;
		this.isUnderReview = false;
		this.isDeclined = false;
		this.isDraft = false;

		// Set in updateAttributesAfterParse()
		this.isCurrentlySubmitted = false;

		// All parameters on the page, zipped up into one
		// pretty package. The most recent value for any given
		// parameter (based on `ts`) takes precedent.
		this.params = {};

		// Holds all of the {{afc submission}} templates that still
		// apply to the page
		this.templates = [];
	};

	/**
	 * Parses a submission, writing its current status and data to various properties
	 * @return {$.Deferred} Resolves with the submission when parsed successfully
	 */
	AFCH.Submission.prototype.parse = function () {
		var sub = this,
			deferred = $.Deferred();

		// Get the page text
		this.page.getText().done( function ( text ) {

			// Then get all templates and parse them
			AFCH.parseTemplates( text ).done( function ( templates ) {
				sub.parseDataFromTemplates( templates );
				sub.updateAttributesAfterParse();
				deferred.resolve( sub );
			} );

		} );

		return deferred;
	};

	/**
	 * Internal function
	 * @param {array} templates list of templates to parse
	 */
	AFCH.Submission.prototype.parseDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		var sub = this,
			submissionTemplates = [];

		$.each( templates, function ( _, template ) {
			if ( template.target.toLowerCase() === 'afc submission' ) {
				submissionTemplates.push( {
					status: template.params.getAndDelete( '1' ).toLowerCase(),
					timestamp: +template.params.getAndDelete( 'ts' ),
					params: template.params
				} );
			}
		} );

		// Sort templates by timestamp; most recent are first
		submissionTemplates.sort( function ( a, b ) {
			// If we're passed something that's not a number --
			// for example, {{REVISIONTIMESTAMP}} -- just sort it
			// first and be done with it.
			if ( isNaN( a.timestamp ) ) {
				return -1;
			} else if ( isNaN( b.timestamp ) ) {
				return 1;
			}

			// Otherwise just sort normally
			return b.timestamp - a.timestamp;
		} );

		// Process the submission templates in order, from the most recent to
		// the oldest. In the process, we remove unneeded templates (for example,
		// a draft tag when it's already been submitted) and also set various
		// "isX" properties of the Submission.
		submissionTemplates = $.grep( submissionTemplates, function ( template ) {
			switch ( template.status ) {
				// Declined
				case 'd':
					if ( !sub.isPending && !sub.isDraft && !sub.isUnderReview ) {
						sub.isDeclined = true;
					}
					break;
				// Draft
				case 't':
					// If it's been submitted or declined, remove draft tag
					if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
						return false;
					}
					sub.isDraft = true;
					break;
				// Under review
				case 'r':
					if ( !sub.isPending && !sub.isDeclined ) {
						sub.isUnderReview = true;
					}
					break;
				// Pending
				default:
					// Remove duplicate pending templates or a redundant
					// pending template when the submission has already been
					// declined / is already under review
					if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
						return false;
					}
					sub.isPending = true;
					sub.isDraft = false;
					sub.isUnderReview = false;
					break;
			}

			// Save the parameter data. Don't overwrite parameters
			// that are already set, because we're going newest
			// to oldest.
			sub.params = $.extend( template.params, sub.params );

			return true;
		} );

		this.templates = submissionTemplates;
	};

	AFCH.Submission.prototype.updateAttributesAfterParse = function () {
		this.isCurrentlySubmitted = this.isPending || this.isUnderReview;
	};

	/**
	 * Pass it a string of text and the old AFC submission templates will be
	 * removed and the new ones (from makeWikicode) added to the top
	 * @param {string} text
	 * @return {string}
	 */
	AFCH.Submission.getUpdatedCodeFromText = function ( text ) {
		// FIXME: Awful regex to remove the old submission templates
		// This is bad. It works for most cases but has a hellish time
		// with some double nested templates or faux nested templates (for
		// example "{{hi|}}}" -- note the extra bracket). Ideally Parsoid
		// would just return the raw template text as well (currently
		// working on a patch for that, actually).
		text = text.replace( /\{\{AFC submission(?:[^{{}}]*|({{.*?}}*))*\}\}/gi, '' );
		text = this.makeWikicode() + '\n' + text;
		return text;
	};

	/**
	 * Converts the template data to a hunk of template wikicode
	 * @return {string}
	 */
	AFCH.Submission.prototype.makeWikicode = function () {
		var output = [];

		$.each( this.templates, function ( _, template ) {
			var tout = '{{AFC submission|' + template.status +
				'|ts=' + template.timestamp;

			$.each( template.params, function ( key, value ) {
				tout += '|' + key + '=' + value;
			} );

			tout += '}}';
			output.push( tout );
		} );

		return output.join( '\n' );
	};


	/**
	 * Checks if submission is G13 eligible
	 * @return {$.Deferred} Resolves to bool if submission is eligible
	 */
	AFCH.Submission.prototype.isG13Eligible = function () {
		var deferred = $.Deferred();

		// Not currently submitted
		if ( this.isCurrentlySubmitted ) {
			deferred.resolve( false );
		}

		// And not been modified in 6 months
		this.getLastModifiedDate().done( function ( lastEdited ) {
			var timeNow = new Date(),
				sixMonthsAgo = ( new Date() ).setMonth( timeNow.getMonth() - 6 );

			deferred.resolve( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) );
		} );

		return deferred;
	};

	/**
	 * Sets the submission status
	 * @param {string} newStatus status to set, 'd'|'t'|'r'|''
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.setStatus = function ( newStatus ) {
		var relevantTemplate = this.templates[0];

		if ( [ 'd', 't', 'r', '' ].indexOf( newStatus ) === -1 ) {
			// Unrecognized status
			return false;
		}

		// If there are no templates on the page, generate a new one
		// (addNewTemplate handles the reparsing)
		if ( !relevantTemplate ) {
			this.addNewTemplate( { status: newStatus } );
		} else {
			// Just modify the top template on the stack and then reparse
			relevantTemplate.status = s;
			this.parseDataFromTemplates( this.templates );
		}

		return true;
	};

	/**
	 * Add a new template to the beginning of this.templates
	 * @param {object} data object with properties of template
	 *                      - status (default: '')
	 *                      - timestamp (default: '{{subst:REVISIONTIMESTAMP}}')
	 *                      - params (default: {})
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.addNewTemplate = function ( data ) {
		this.templates.unshift( $.extend( {
			status: '',
			timestamp: '{{subst:REVISIONTIMESTAMP}}',
			params: {}
		}, data ) );

		// Reparse :P
		this.parseDataFromTemplates( this.templates );

		return true;
	};

	$afchReviewPanel = $( '<div>' )
		.attr( 'id', 'afch' )
		.addClass( 'afch-loading' )
		.prependTo( '#mw-content-text' )
		// FIXME: Show a sexy loader graphic
		.text( 'AFCH is loading...' );

	// Set up the link which opens the interface
	$( '<span>' )
		.attr( 'id', 'afch-open' )
		.appendTo( '#firstHeading' )
		.text( 'Review submission »' )
		.on( 'click', function () {
			$afchReviewPanel.show( 'slide', { direction: 'down' } );
			setupReviewPanel();
		} );

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
