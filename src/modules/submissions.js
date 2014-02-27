//<nowiki>
( function ( AFCH, $, mw ) {
	var $afchLaunchLink, $afch, $afchWrapper,
		afchPage, afchSubmission, afchViews, afchViewer;

	// Die if reviewing a nonexistent page
	if ( mw.config.get( 'wgArticleId' ) === 0 ) {
		return;
	}

	/**
	 * Represents an AfC submission -- its status as well as comments.
	 * Call submission.parse() to actually run the parsing process and fill
	 * the object with useful data.
	 *
	 * @param {AFCH.Page} page The submission page
	 */
	AFCH.Submission = function ( page ) {
		// The associated page
		this.page = page;

		// 'WT:Articles for creation/Foo' => 'Foo'
		this.shortTitle = this.page.title.getMainText().match( /([^\/]+$)/ )[1];

		this.resetVariables();
	};

	/**
	 * Resets variables and lists related to the submission state
	 */
	AFCH.Submission.prototype.resetVariables = function () {
		// Various submission states, set in parse()
		this.isPending = false;
		this.isUnderReview = false;
		this.isDeclined = false;
		this.isDraft = false;

		// Set in updateAttributesAfterParse()
		this.isCurrentlySubmitted = false;
		this.hasAfcTemplate = false;

		// All parameters on the page, zipped up into one
		// pretty package. The most recent value for any given
		// parameter (based on `ts`) takes precedent.
		this.params = {};

		// Holds all of the {{afc submission}} templates that still
		// apply to the page
		this.templates = [];

		// Holds all comments on the page
		this.comments = [];
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
				sub.loadDataFromTemplates( templates );
				sub.sortAndParseInternalData();
				deferred.resolve( sub );
			} );

		} );

		return deferred;
	};

	/**
	 * Internal function
	 * @param {array} templates list of templates to parse
	 */
	AFCH.Submission.prototype.loadDataFromTemplates = function ( templates ) {
		// Represent each AfC submission template as an object.
		var submissionTemplates = [],
			commentTemplates = [];

		$.each( templates, function ( _, template ) {
			var name = template.target.toLowerCase();
			if ( name  === 'afc submission' ) {
				submissionTemplates.push( {
					status: AFCH.getAndDelete( template.params, '1').toLowerCase(),
					timestamp: +AFCH.getAndDelete( template.params, 'ts' ),
					params: template.params
				} );
			} else if ( name === 'afc comment' ) {
				commentTemplates.push( {
					// If we can't find a timestamp, set it to unicorns, because everyone
					// knows that unicorns always come first.
					timestamp: AFCH.parseForTimestamp( template.params['1'], /* mwstyle */ true ) || 'unicorns',
					text: template.params['1']
				} );
			}
		} );

		this.templates = submissionTemplates;
		this.comments = commentTemplates;
	};

	/**
	 * Sort the internal lists of AFC submission and Afc comment templates
	 */
	AFCH.Submission.prototype.sortAndParseInternalData = function () {
		var sub = this,
			submissionTemplates = this.templates,
			commentTemplates = this.comments;

		function timestampSortHelper ( a, b ) {
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
		}

		// Sort templates by timestamp; most recent are first
		submissionTemplates.sort( timestampSortHelper );
		commentTemplates.sort( timestampSortHelper );

		// Reset variables related to the submisson state before re-parsing
		this.resetVariables();

		// Useful list of "what to do" in each situation.
		var statusCases = {
			// Declined
			d: function () {
				if ( !sub.isPending && !sub.isDraft && !sub.isUnderReview ) {
					sub.isDeclined = true;
				}
				return true;
			},
			// Draft
			t: function () {
				// If it's been submitted or declined, remove draft tag
				if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
					return false;
				}
				sub.isDraft = true;
				return true;
			},
			// Under review
			r: function () {
				if ( !sub.isPending && !sub.isDeclined ) {
					sub.isUnderReview = true;
				}
				return true;
			},
			// Pending
			'': function () {
				// Remove duplicate pending templates or a redundant
				// pending template when the submission has already been
				// declined / is already under review
				if ( sub.isPending || sub.isDeclined || sub.isUnderReview ) {
					return false;
				}
				sub.isPending = true;
				sub.isDraft = false;
				sub.isUnderReview = false;
				return true;
			}
		};

		// Process the submission templates in order, from the most recent to
		// the oldest. In the process, we remove unneeded templates (for example,
		// a draft tag when it's already been submitted) and also set various
		// "isX" properties of the Submission.
		submissionTemplates = $.grep( submissionTemplates, function ( template ) {
			var keepTemplate = true;

			if ( statusCases[template.status] ) {
				keepTemplate = statusCases[template.status]();
			} else {
				// Default pending status
				keepTemplate = statusCases['']();
			}

			// If we're going to be keeping this template on the page,
			// save the parameter data. Don't overwrite parameters that
			// are already set, because we're going newest to oldest.
			if ( keepTemplate ) {
				sub.params = $.extend( {}, template.params, sub.params );
			}

			return keepTemplate;
		} );

		this.isCurrentlySubmitted = this.isPending || this.isUnderReview;
		this.hasAfcTemplate = !!submissionTemplates.length;

		this.templates = submissionTemplates;
		this.comments = commentTemplates;
	};

	/**
	 * Converts all the data to a hunk of wikicode
	 * @return {string}
	 */
	AFCH.Submission.prototype.makeWikicode = function () {
		var output = [];

		// Submission templates go first
		$.each( this.templates, function ( _, template ) {
			var tout = '{{AFC submission|' + template.status,
				paramKeys = [];

			// FIXME: Think about if we really want this elaborate-ish
			// positional parameter ouput, or if it would be a better
			// idea to just make everything absolute. When we get to a point
			// where nobody is using the actual templates and it's 100%
			// script-based, "pretty" isn't really that important and we
			// can scrap this. Until then, though, we can only dream...

			// Make an array of the parameters
			$.each( template.params, function ( key ) {
				paramKeys.push( key );
			} );

			paramKeys.sort( function ( a, b ) {
				var aIsNumber = !isNaN( a ),
					bIsNumber = !isNaN( b );

				// If we're passed two numerical parameters then
				// sort them in order (1,2,3)
				if ( aIsNumber && aIsNumber ) {
					return ( +a ) > ( +b ) ? 1 : -1;
				}

				// A is a number, it goes first
				if ( aIsNumber && !bIsNumber ) {
					return -1;
				}

				// B is a number, it goes first
				if ( !aIsNumber && bIsNumber ) {
					return 1;
				}

				// Otherwise just leave the positions as they were
				return 0;
			} );

			$.each( paramKeys, function ( index, key ) {
				var value = template.params[key];
				// If it is a numerical parameter, doesn't include
				// `=` in the value, AND is in sequence with the other
				// numerical parameters, we can omit the key= part
				// (positional parameters, joyous day :/ )
				if ( key == +key && +key % 1 === 0 &&
					value.indexOf( '=' ) === -1 &&
					// Parameter 2 will be the first positional parameter,
					// since 1 is always going to be the submission status.
					key === '2' || paramKeys[index-1] == +key-1 )
				{
					tout += '|' + value;
				} else {
					tout += '|' + key + '=' + value;
				}
			} );

			// Finally, add the timestamp
			tout += '|ts=' + template.timestamp + '}}';

			output.push( tout );
		} );

		// Then comment templates
		$.each( this.comments, function ( _, comment ) {
			output.push( '{{AFC comment|1=' + comment.text + '}}' );
		} );

		// If there were comments, add a horizontal rule beneath them
		if ( this.comments.length ) {
			output.push( '\n----' );
		}

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
		this.page.getLastModifiedDate().done( function ( lastEdited ) {
			var timeNow = new Date(),
				sixMonthsAgo = new Date();

			sixMonthsAgo.setMonth( timeNow.getMonth() - 6 );

			deferred.resolve( ( timeNow.getTime() - lastEdited.getTime() ) >
				( timeNow.getTime() - sixMonthsAgo.getTime() ) );
		} );

		return deferred;
	};

	/**
	 * Sets the submission status
	 * @param {string} newStatus status to set, 'd'|'t'|'r'|''
	 * @param {params} optional; params to add to the template whose status was set
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.setStatus = function ( newStatus, newParams ) {
		var relevantTemplate = this.templates[0];

		if ( [ 'd', 't', 'r', '' ].indexOf( newStatus ) === -1 ) {
			// Unrecognized status
			return false;
		}

		if ( !newParams ) {
			newParams = {};
		}

		// If there are no templates on the page, just generate a new one
		// (addNewTemplate handles the reparsing)
		if ( !relevantTemplate ||
			// Same for if the top template on the stack is alrady declined;
			// we don't want to overwrite it
			relevantTemplate.status === 'd' )
		{
			this.addNewTemplate( {
					status: newStatus,
					params: newParams
			} );
		} else {
			// Just modify the template at the top of the stack. Update its
			// timestamp because it has been modified
			relevantTemplate.status = newStatus;
			relevantTemplate.timestamp = '{{subst:REVISIONTIMESTAMP}}';

			// Add new parameters if specified
			$.extend( relevantTemplate.params, newParams );

			// And finally reparse
			this.sortAndParseInternalData();
		}

		return true;
	};

	/**
	 * Add a new template to the beginning of this.templates
	 * @param {object} data object with properties of template
	 *                      - status (default: '')
	 *                      - timestamp (default: '{{subst:REVISIONTIMESTAMP}}')
	 *                      - params (default: {})
	 */
	AFCH.Submission.prototype.addNewTemplate = function ( data ) {
		this.templates.unshift( $.extend( /* deep */ true, {
			status: '',
			timestamp: '{{subst:REVISIONTIMESTAMP}}',
			params: {
				ns: mw.config.get( 'wgNamespaceNumber' )
			}
		}, data ) );

		// Reparse :P
		this.sortAndParseInternalData();
	};

	/**
	 * Add a new comment to the beginning of this.comments
	 * @param {string} text comment text
	 * @return {bool} success
	 */
	AFCH.Submission.prototype.addNewComment = function ( text ) {
		this.comments.unshift( {
			// Unicorns are explained in loadDataFromTemplates()
			timestamp: AFCH.parseForTimestamp( text, /* mwstyle */ true ) || 'unicorns',
			text: text
		} );

		// Reparse :P
		this.sortAndParseInternalData();

		return true;
	};

	/**
	 * Gets the submitter, or, if no specific submitter is available,
	 * just the page creator
	 *
	 * @return {$.Deferred} resolves with user
	 */
	AFCH.Submission.prototype.getSubmitter = function () {
		var deferred = $.Deferred(),
			user = this.params.u;

		if ( user ) {
			deferred.resolve( user );
		} else {
			this.page.getCreator().done( function ( user ) {
				deferred.resolve( user );
			} );
		}

		return deferred;
	};


	/**
	 * Represents text of an AfC submission
	 * @param {[type]} text [description]
	 */
	AFCH.Text = function ( text ) {
		this.text = text;
	};

	AFCH.Text.prototype.get = function () {
		return this.text;
	};

	AFCH.Text.prototype.set = function ( string ) {
		this.text = string;
		return this.text;
	};

	AFCH.Text.prototype.prepend = function ( string ) {
		this.text = string + this.text;
		return this.text;
	};

	AFCH.Text.prototype.append = function ( string ) {
		this.text += string;
		return this.text;
	};

	AFCH.Text.prototype.cleanUp = function ( isAccept ) {
		var text = this.text;

		if ( isAccept ) {

			// Uncomment cats and templates
			text = text.replace( /\[\[:Category:/gi, '[[Category:' );
			text = text.replace( /\{\{(tl|tlx|tlg)\|(.*?)\}\}/ig, '{{$2}}');

		} else {

			// Comment out cats
			text = text.replace( /\[\[Category:/gi, '[[:Category:' );

		}

		// Remove html comments (<!--) that surround categories
		text = text.replace( /<!--\s*((\[\[:{0,1}(Category:.*?)\]\]\s*)+)-->/gi, '$1');

		// FIXME: Remove wizardy things

		this.text = text;
		this.removeExcessNewlines();

		return this.text;
	};

	AFCH.Text.prototype.removeExcessNewlines = function () {
		// Replace 3+ newlines with just two
		this.text = this.text.replace( /(?:[\t ]*(?:\r?\n|\r)){3,}/ig, '\n\n' );
		// Remove all whitespace at the top of the article
		this.text = this.text.replace( /^\s*/, '' );
	};

	AFCH.Text.prototype.removeAfcTemplates = function () {
		// FIXME: Awful regex to remove the old submission templates
		// This is bad. It works for most cases but has a hellish time
		// with some double nested templates or faux nested templates (for
		// example "{{hi|}}}" -- note the extra bracket). Ideally Parsoid
		// would just return the raw template text as well (currently
		// working on a patch for that, actually).
		this.text = this.text.replace( /\{\{afc submission(?:[^{{}}]*|({{.*?}}*))*\}\}/gi, '' );
		this.text = this.text.replace( /\{\{\s*afc comment(?:\{\{[^\{\}]*\}\}|[^\}\{])*\}\}/gi, '' );

		// Remove horizontal rules that were added by AFCH after the comments
		this.text = this.text.replace( /^----+$/gm, '' );

		// Remove excess newlines created by AFC templates
		this.removeExcessNewlines();

		return this.text;
	};

	/**
	 * Removes old submission templates/comments and then adds new ones
	 * specified by `new`
	 * @param {string} new
	 */
	AFCH.Text.prototype.updateAfcTemplates = function ( newCode ) {
		this.removeAfcTemplates();
		return this.prepend( newCode + '\n\n' );
	};

	// This creates the link in the header which allows
	// users to launch afch. When launched, the link fades
	// away, like a unicorn.
	$afchLaunchLink = $( '<span>' )
		.attr( 'id', 'afch-open' )
		.appendTo( '#firstHeading' )
		.text( 'Review submission »' )
		.click( function () {
			$( this ).fadeOut();
			createAFCHInstance();
		} );


	function createAFCHInstance () {
		/**
		 * global; wraps ALL afch-y things
		 */
		$afch = $( '<div>' )
			.attr( 'id', 'afch' )
			.prependTo( '#mw-content-text' )
			.append(
				$( '<div>' )
					.attr( 'id', 'afchLeft' )
					.addClass( 'top-bar-element' )
					.append(
						// Back link appears based on context
						$( '<span>' )
							.attr( 'id', 'afchBackLink' )
							.html( '&#8592; | ' ) // back arrow
							.addClass( 'hidden' )
							.click( function () {
								if ( afchViewer.loadPrevious ) {
									afchViewer.loadPrevious();
									$( this ).addClass( 'hidden' );
								}
							} )
					),

				// Include the close link in the upper right
				$( '<div>' )
					.attr( 'id', 'afchClose' )
					.addClass( 'top-bar-element' )
					.html( '&times;' )
					.click( function () {
						// DIE DIE DIE
						$afch.remove();
						// Show the launch link again
						$afchLaunchLink.fadeIn();
					} )
			);

		/**
		 * global; wrapper for specific afch panels
		 */
		$afchWrapper = $( '<div>' )
			.attr( 'id', 'afchPanelWrapper' )
			.appendTo( $afch )
			.append(
				// Build splash panel in JavaScript rather than via
				// a template so we don't have to wait for the
				// HTTP request to go through
				$( '<div>' )
						.attr( 'id', 'afchReviewPanel' )
						.addClass( 'splash' )
						.append(
							$( '<div>' )
								.attr( 'id', 'afchInitialHeader' )
								.text( 'AFCH v' + AFCH.consts.version + ' / ' + AFCH.consts.versionName )
						)
				);

		// Now set up the review panel and replace it with
		// actually content, not just a splash screen
		setupReviewPanel();
	}

	function setupReviewPanel () {
		// Store this to a variable so we can wait for its success
		var loadViews = $.ajax( {
				type: 'GET',
				url: AFCH.consts.baseurl + '/tpl-submissions.js',
				dataType: 'text'
			} ).done( function ( data ) {
				/* global */
				afchViews = new AFCH.Views( data );
				/* global */
				afchViewer = new AFCH.Viewer( afchViews, $afchWrapper );
			} );

		/* global */
		afchPage = new AFCH.Page( AFCH.consts.pagename );

		/* global */
		afchSubmission = new AFCH.Submission( afchPage );

		// Set up messages for later
		setMessages();

		// Parse the page and load the view templates. When done,
		// continue with everything else.
		$.when(
			afchSubmission.parse(),
			loadViews
		).then( function ( submission ) {
			// Render the base buttons view
			loadView( 'main', {
				title: submission.shortTitle,
				accept: submission.isCurrentlySubmitted,
				decline: submission.isCurrentlySubmitted,
				comment: true, // Comments are always okay!
				submit: !submission.isCurrentlySubmitted,
				version: AFCH.consts.version,
				versionName: AFCH.consts.versionName
			} );

			// Add the feedback link to the left panel
			AFCH.initFeedback( '#afchLeft', 'article review' );

			// Set up click handlers
			$( '#afchAccept' ).click( showAcceptOptions );
			$( '#afchDecline' ).click( showDeclineOptions );
			$( '#afchComment' ).click( showCommentOptions );
			$( '#afchSubmit' ).click( showSubmitOptions );
			$( '#afchG13' ).click( showG13Options );

			// Get G13 eligibility and when known, display the button...
			// but don't hold up the rest of the loading to do so
			afchSubmission.isG13Eligible().done( function ( eligible ) {
				$( '#afchG13' ).toggleClass( 'hidden', !eligible );
			} );

		} );
	}

	/**
	 * Stores useful strings to AFCH.msg
	 */
	function setMessages () {
		AFCH.msg.set( {
			// $1 = article name
			// $2 = article class or '' if not available
			'accepted-submission': '{{subst:Afc talk|$1|class=$2|sig=~~~~}}',

			// $1 = article name
			// $2 = copyright violation ('yes'/'no')
			'declined-submission': '{{subst:Afc decline|$1|cv=$2|sig=yes}}',

			// $1 = article name
			'comment-on-submission': '{{subst:AFC notification|comment|article=$1}}'
		} );
	}

	/**
	 * Clear the viewer, set up the status log, and
	 * then update the button text
	 */
	function prepareForProcessing () {
		var submitBtn = $( '#afchSubmitForm' );

		// Empty the content area except for the button...
		$( '#afchContent' ).contents().not( submitBtn ).remove();

		// ...and set up the status log in its place
		AFCH.status.init( '#afchContent' );

		// Update the button show the `running` text
		submitBtn
			.text( submitBtn.data( 'running' ) )
			.removeClass( 'gradient-button' )
			.addClass( 'disabled-button' )
			.off( 'click' );

		// And finally, make it so when all AJAX requests are
		// complete, the done text will be displayed
		$( document ).ajaxStop( function () {
			submitBtn.text( submitBtn.data( 'done' ) );
		} );
	}

	/**
	 * Adds handler for when the accept/decline/etc form is submitted
	 * that calls a given function and passes an object to the function
	 * containing data from all .afch-input elements in the dom.
	 *
	 * Also sets up the viewer for the "processing" stage.
	 *
	 * @param {Function} fn function to call with data
	 */
	function addFormSubmitHandler ( fn ) {
		$( '#afchSubmitForm' ).click( function () {
			var data = {};

			// Provide page text; use cache created
			// after afchSubmission.parse()
			afchPage.getText( true ).done( function ( text ) {
				data.afchText = new AFCH.Text( text );

				// Also provide the values for each afch-input element
				$( '.afch-input' ).each( function ( _, element ) {
					var value;

					if ( element.type === 'checkbox' ) {
						value = element.checked;
					} else {
						value = $( element ).val();
					}

					data[element.id] = value;
				} );

				prepareForProcessing();

				// Now finally call the applicable handler
				fn( data );
			} );
		} );
	}

	/**
	 * Loads a new view
	 * @param {string} name view to be loaded
	 * @param {object} data data to populate the view with
	 * @param {function} callback function to call when view is loaded
	 */
	function loadView ( name, data, callback ) {
		// Show the back button if we're not loading the main view
		$( '#afchBackLink' ).toggleClass( 'hidden', name === 'main' );
		afchViewer.loadView( name, data );
		if ( callback ) {
			callback();
		}
	}

	// These functions show the options before doing something
	// to a submission.

	function showAcceptOptions () {
		loadView( 'accept', {
			newTitle: afchSubmission.shortTitle
		} );
		addFormSubmitHandler( handleAccept );
	}

	function showDeclineOptions () {
		loadView( 'decline', {}, function () {
			var pristineState = $( '#declineInputWrapper' ).html();

			function updateTextfield( newPrompt, newPlaceholder ) {
				var wrapper = $( '#textfieldWrapper' );

				// Update label and placeholder
				wrapper.find( 'label' ).text( newPrompt );
				wrapper.find( 'input' ).attr( 'placeholder', newPlaceholder );

				// And finally show the textfield
				wrapper.removeClass( 'hidden' );
			}

			// Set up jquery.chosen for the decline reason
			$( '#declineReason' ).chosen( {
				placeholder_text_single: 'Select a decline reason...',
				no_results_text: 'Whoops, no reasons matched your search. Type "custom" to add a custom rationale instead.',
				search_contains: true,
				inherit_select_classes: true
			} );

			// And now add the handlers for when a specific decline reason is selected
			$( '#declineReason' ).change( function () {
				var reason = $( '#declineReason' ).val(),
					declineHandlers = {
						cv: function () {
							updateTextfield( 'Original URL', 'http://example.com/cake' );
						},

						dup: function () {
							updateTextfield( 'Title of duplicate submission (no namespace)', 'Articles for creation/Fudge' );
						},

						mergeto: function () {
							updateTextfield( 'Article which submission should be merged into', 'Milkshake' );
						},

						lang: function () {
							updateTextfield( 'Language of the submission if known', 'German' );
						},

						exists: function () {
							updateTextfield( 'Title of existing article', 'Chocolate chip cookie' );
						},

						plot: function () {
							updateTextfield( 'Title of existing related article, if one exists', 'Charlie and the Chocolate Factory' );
						},

						van: function () {
							$( '#blankWrapper' ).add( '#csdWrapper' )
								.removeClass( 'hidden' )
								.children( 'input' ).prop( 'checked', true );
						},

						blp: function () {
							$( '#blankWrapper' )
								.removeClass( 'hidden' )
								.children( 'input' ).prop( 'checked', true );
						},

						// Custom decline rationale
						reason: function () {
							$( '#declineTextarea' )
								.attr( 'placeholder', 'Enter your decline reason here; be clear and supportive. Use wikicode syntax ' +
								'and link to relevant policies or pages with additional information.' );
						}
					};

				// Reset to a pristine state :)
				$( '#declineInputWrapper' ).html( pristineState );

				// If there are special options to be displayed for this
				// particular decline reason, load them now
				if ( declineHandlers[reason] ) {
					declineHandlers[reason]();
				}

				// If a reason has been specified, show the textarea, notify
				// option, and the submit form button
				$( '#declineTextarea' ).add( '#notifyWrapper' ).add( '#afchSubmitForm' )
					.toggleClass( 'hidden', !reason );
			} );
		} );

		addFormSubmitHandler( handleDecline );
	}

	function showCommentOptions () {
		loadView( 'comment', {} );
		addFormSubmitHandler( handleComment );
	}

	function showSubmitOptions () {
		var customSubmitters = [];

		if ( afchSubmission.params.u ) {
			customSubmitters.push( {
				name: afchSubmission.params.u,
				description: 'Most recent submitter',
				selected: true
			} );
		}

		loadView( 'submit', {
			customSubmitters: customSubmitters
		}, function () {
			// Show the other textbox when `other` is selected in the menu
			$( '#submitType' ).change( function () {
				var otherSelected = $( '#submitType' ).val() === 'other';
				$( '#submitterName' ).toggleClass( 'hidden', !otherSelected );
			} );
		} );

		addFormSubmitHandler( handleSubmit );
	}

	function showG13Options () {
		loadView( 'g13', {} );
		addFormSubmitHandler( handleG13 );
	}

	// These functions actually perform a given action using data passed
	// in the `data` parameter.

	/**
	 * handleAccept
	 * @param {object} data
	 *                  - newTitle
	 *                  - notifyUser
	 *                  - newClass
	 */
	function handleAccept ( data ) {
		var text = data.afchText;

		AFCH.actions.movePage( afchPage, data.newTitle )
			.done( function () {
				if ( data.notifyUser ) {
					afchSubmission.getSubmitter().done( function ( submitter ) {
						AFCH.actions.notifyUser( submitter, {
							message: AFCH.msg.get( 'accepted-submission',
								{ '$1': data.newTitle, '$2': data.newClass } )
						} );
					} );
				}
			} )
			.fail( function () {
				return;
			} );
	}

	function handleDecline ( data ) {
		var text = data.afchText,
			declineReason = data.declineReason,
			newParams = {
				'2': declineReason,
				decliner: AFCH.consts.user,
				declinets: '{{subst:REVISIONTIMESTAMP}}'
			};

		// If this is a custom decline, we include the declineTextarea in the {{AFC submission}} template
		if ( declineReason === 'reason' ) {
			newParams['3'] = data.declineTextarea;
		// But otherwise if addtional text has been entered we just add it as a new comment
		} else if ( data.declineTextarea ) {
			afchSubmission.addNewComment( data.declineTextarea );
		}

		// If a user has entered something in the declineTextfield (for example, a URL or an
		// associated page), pass that as the third parameter
		if ( data.declineTextfield ) {
			newParams['3'] = data.declineTextfield;
		}

		// FIXME: Handle blanking and csd-ing!

		// Now update the submission status
		afchSubmission.setStatus( 'd', newParams );

		text.updateAfcTemplates( afchSubmission.makeWikicode() );
		text.cleanUp();

		afchPage.edit( {
			contents: text.get(),
			summary: 'Declining submission'
		} );

		if ( data.notifyUser ) {
			afchSubmission.getSubmitter().done( function ( submitter ) {
				AFCH.actions.notifyUser( submitter, {
					message: AFCH.msg.get( 'declined-submission', {
						'$1': AFCH.consts.pagename,
						'$2': declineReason === 'cv' ? 'yes' : 'no'
					} ),
					summary: "Notification: Your [[" + AFCH.consts.pagename + "|Articles for Creation submission]] has been declined"
				} );
			} );
		}
	}

	function handleComment ( data ) {
		var text = data.afchText,
			comment = $.trim( data.commentText ) + ' ~~~~';

		afchSubmission.addNewComment( comment );
		text.updateAfcTemplates( afchSubmission.makeWikicode() );

		text.cleanUp();

		afchPage.edit( {
			contents: text.get(),
			summary: 'Commenting on submission'
		} );

		if ( data.notifyUser ) {
			afchSubmission.getSubmitter().done( function ( submitter ) {
				AFCH.actions.notifyUser( submitter, {
					message: AFCH.msg.get( 'comment-on-submission',
						{ '$1': AFCH.consts.pagename } ),
					summary: "Notification: I've commented on [[" + AFCH.consts.pagename + "|your Articles for Creation submission]]"
				} );
			} );
		}
	}

	function handleSubmit ( data ) {
		var text = data.afchText,
			submitter = $.Deferred(),
			submitType = data.submitType;

		if ( submitType === 'other' ) {
			submitter.resolve( data.submitterName );
		} else if ( submitType === 'self' ) {
			submitter.resolve( AFCH.consts.user );
		} else if ( submitType === 'creator' ) {
			afchPage.getCreator().done( function ( user ) {
				submitter.resolve( user );
			} );
		} else {
			// Custom selected submitter
			submitter.resolve( data.submitType );
		}

		submitter.done( function ( submitter ) {
			afchSubmission.setStatus( '', { u: submitter } );

			text.updateAfcTemplates( afchSubmission.makeWikicode() );
			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Submitting'
			} );

		} );

	}

	function handleG13 ( data ) {
		return;
	}

}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
