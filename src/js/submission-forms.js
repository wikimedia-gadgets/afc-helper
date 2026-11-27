// <nowiki>
( function ( AFCH, $, mw ) {
	/**
	 * Creates the form setup handlers for a submission review panel.
	 *
	 * @param {Object} dependencies
	 * @param {jQuery} dependencies.$afch Review panel element
	 * @param {AFCH.Page} dependencies.page Submission page
	 * @param {AFCH.Submission} dependencies.submission Parsed submission
	 * @param {Function} dependencies.loadView
	 * @param {Function} dependencies.prepareForProcessing
	 * @param {Function} dependencies.checkForEditConflict
	 * @param {Function} dependencies.showEditConflictMessage
	 * @param {Function} dependencies.handleAccept
	 * @param {Function} dependencies.handleAcceptOverRedirect
	 * @param {Function} dependencies.handleDecline
	 * @param {Function} dependencies.handleComment
	 * @param {Function} dependencies.handleSubmit
	 * @param {Function} dependencies.handlePostponeG13
	 * @constructor
	 */
	AFCH.SubmissionForms = function ( dependencies ) {
		const $afch = dependencies.$afch;
		const afchPage = dependencies.page;
		const afchSubmission = dependencies.submission;
		const loadView = dependencies.loadView;
		const prepareForProcessing = dependencies.prepareForProcessing;
		const checkForEditConflict = dependencies.checkForEditConflict;
		const showEditConflictMessage = dependencies.showEditConflictMessage;
		const handleAccept = dependencies.handleAccept;
		const handleAcceptOverRedirect = dependencies.handleAcceptOverRedirect;
		const handleDecline = dependencies.handleDecline;
		const handleComment = dependencies.handleComment;
		const handleSubmit = dependencies.handleSubmit;
		const handlePostponeG13 = dependencies.handlePostponeG13;

		/**
		 * Adds handler for when the accept/decline/etc form is submitted
		 * that calls a given function and passes an object to the function
		 * containing data from all .afch-input elements in the dom.
		 *
		 * Also sets up the viewer for the "processing" stage.
		 *
		 * @param {Function} fn function to call with data
		 * @param {Object} extraData more data to pass; will be inserted
		 *                           into the data passed to `fn`
		 */
		function addFormSubmitHandler( fn, extraData ) {
			$afch.find( '#afchSubmitForm' ).on( 'click', () => {
				const data = {};

				// Provide page text; use cache created after afchSubmission.parse()
				afchPage.getText( false ).done( ( text ) => {
					data.afchText = new AFCH.Text( text );

					// Also provide the values for each afch-input element
					$.extend( data, AFCH.getFormValues( $afch.find( '.afch-input' ) ) );

					// Also provide extra data
					$.extend( data, extraData );

					checkForEditConflict().then( ( editConflict ) => {
						if ( editConflict ) {
							showEditConflictMessage();
							return;
						}

						// Hide the HTML form. Show #afchStatus messages
						prepareForProcessing();

						// Now finally call the applicable handler
						fn( data );
					} );
				} );
			} );
		}

		// These functions show the options before doing something
		// to a submission.

		function showAcceptOptions() {
			/**
			 * If possible, use the session storage to get the WikiProject list.
			 * If it hasn't been cached already, load it manually and then cache
			 *
			 * @return {jQuery.Deferred}
			 */
			function loadWikiProjectList() {
				let deferred = $.Deferred(),
					// Left over from when a new version of AFCH would invalidate the WikiProject cache. The lsKey doesn't change nowadays though.
					lsKey = 'mw-afch-wikiprojects-2',
					wikiProjects = mw.storage.getObject( lsKey );

				if ( wikiProjects ) {
					deferred.resolve( wikiProjects );
				} else {
					wikiProjects = [];
					$.ajax( {
						url: mw.config.get( 'wgServer' ) + '/w/index.php?title=Wikipedia:WikiProject_Articles_for_creation/WikiProject_templates.json&action=raw&ctype=text/json',
						dataType: 'json'
					} ).done( ( projectData ) => {
						$.each( projectData, ( display, template ) => {
							wikiProjects.push( {
								displayName: display,
								templateName: template
							} );
						} );

						// If possible, cache the WikiProject data!
						if ( !mw.storage.setObject( lsKey, wikiProjects, ( 7 * 24 * 60 * 60 ) ) ) {
							AFCH.log( 'Unable to cache WikiProject list.' );
						}

						deferred.resolve( wikiProjects );
					} ).fail( ( jqxhr, textStatus, errorThrown ) => {
						console.error( 'Could not parse WikiProject list: ', textStatus, errorThrown );
					} );
				}

				return deferred;
			}

			const existingWikiProjectsPromise = $.when(
				loadWikiProjectList(),
				new AFCH.Page( 'Draft talk:' + afchSubmission.shortTitle ).getTemplates( true )
			).then( ( wikiProjects, templates ) => {
				// Turn the WikiProject list into an Object to make lookups faster
				let wikiProjectMap = {};
				for ( let projIdx = 0; projIdx < wikiProjects.length; projIdx++ ) {
					wikiProjectMap[ wikiProjects[ projIdx ].templateName.toLowerCase() ] = {
						displayName: wikiProjects[ projIdx ].displayName,
						templateName: wikiProjects[ projIdx ].templateName,
						alreadyOnPage: false
					};
				}

				let alreadyHasWPBio = false;

				templates.forEach( ( template ) => {
					const name = template.target.trim(),
						lowercaseName = name.toLowerCase();
					if ( wikiProjectMap.hasOwnProperty( lowercaseName ) ) {
						wikiProjectMap[ lowercaseName ].alreadyOnPage = true;
					} else if ( lowercaseName === 'wikiproject biography' ) {
						alreadyHasWPBio = true;
					} else if ( /^wikiproject\s+/i.test( name ) &&
						!/^wikiproject\s+(?:banners?(?:\s*(?:shell|holder)(?:\/test1)?)?|cooperation shell|shell)$/i.test( name ) ) {
						// In the "Add WikiProjects" box, show WikiProjects on the talk page, even if they aren't present in the master list of suggested WikiProjects at Wikipedia:WikiProject_Articles_for_creation/WikiProject_templates.json
						wikiProjectMap[ lowercaseName ] = {
							displayName: name.replace( /^wikiproject\s+/i, '' ),
							templateName: name,
							alreadyOnPage: true
						};
					}
				} );
				return {
					alreadyHasWPBio: alreadyHasWPBio,
					wikiProjectMap: wikiProjectMap
				};
			} );

			$.when(
				afchPage.getText( false ),
				existingWikiProjectsPromise,
				afchPage.getCategories( /* useApi */ false, /* includeCategoryLinks */ true ),
				afchPage.getShortDescription()
			).then( ( pageText, existingWikiProjectsResult, categories, shortDescription ) => {
				const alreadyHasWPBio = existingWikiProjectsResult.alreadyHasWPBio,
					wikiProjectMap = existingWikiProjectsResult.wikiProjectMap;
				const existingWikiProjects = []; // already on draft's talk page
				$.each( wikiProjectMap, ( lowercaseTemplateName, obj ) => {
					if ( obj.alreadyOnPage ) {
						existingWikiProjects.push( obj );
					}
				} );
				const hasWikiProjects = Object.keys( wikiProjectMap ).length > 0;
				if ( !hasWikiProjects ) {
					mw.notify( 'Could not load WikiProject list!' );
				}
				const wikiProjectObjs = Object.keys( wikiProjectMap ).map( ( key ) => wikiProjectMap[ key ] );

				loadView( 'accept', {
					newTitle: afchSubmission.shortTitle,
					hasWikiProjects: hasWikiProjects,
					wikiProjects: wikiProjectObjs,
					categories: categories,
					shortDescription: shortDescription,
					// Only offer to patrol the page if not already patrolled (in other words, if
					// the "Mark as patrolled" link can be found in the DOM)
					showPatrolOption: !!$afch.find( '.patrollink' ).length
				}, () => {
					$afch.find( '#newAssessment' ).chosen( {
						allow_single_deselect: true,
						disable_search: true,
						width: '140px',
						placeholder_text_single: 'Click to select'
					} );

					// If draft is assessed as stub, show stub sorting
					// interface using User:SD0001/StubSorter.js
					$afch.find( '#newAssessment' ).on( 'change', function () {
						const isClassStub = $( this ).val() === 'Stub';
						$afch.find( '#stubSorterWrapper' ).toggleClass( 'hidden', !isClassStub );
						if ( isClassStub ) {
							if ( mw.config.get( 'wgDBname' ) !== 'enwiki' && mw.config.get( 'wgDBname' ) !== 'testwiki' ) {
								console.warn( 'no stub sorting script available for this language wiki' );
								return;
							}

							if ( $afch.find( '#stubSorterContainer' ).html() === '' ) {
								mw.hook( 'StubSorter_activate' ).fire( $afch.find( '#stubSorterContainer' ) );
								let promise = $.when();
								const wasStubSorterActivated = $afch.find( '#stubSorterContainer' ).html() !== '';
								if ( !wasStubSorterActivated ) {
									promise = mw.loader.getScript( 'https://en.wikipedia.org/w/index.php?title=User:SD0001/StubSorter.js&action=raw&ctype=text/javascript' );
								}

								promise.then( () => {
									if ( !wasStubSorterActivated ) {
										mw.hook( 'StubSorter_activate' ).fire( $afch.find( '#stubSorterContainer' ) );
									}

									$( '#stub_sorter_select_chosen' ).css( 'width', '' );
									$( '#stub-sorter-select' ).addClass( 'afch-input' );

									if ( /\{\{[^{ ]*[sS]tub(\|.*?)?\}\}\s*/.test( pageText ) ) {
										$afch.find( '#newAssessment' ).val( 'Stub' ).trigger( 'chosen:updated' ).trigger( 'change' );
									}
								} );
							}
						}
					} );

					$afch.find( '#newWikiProjects' ).chosen( {
						placeholder_text_multiple: 'Start typing to filter WikiProjects...',
						no_results_text: 'Whoops, no WikiProjects matched in database!',
						width: '350px'
					} );

					// Extend the chosen menu for new WikiProjects. We hackily show a
					// "Click to manually add {{PROJECT}}" link -- sadly, jquery.chosen
					// doesn't support this natively.
					$afch.find( '#newWikiProjects_chzn input' ).on( 'keyup', function () {
						const $chzn = $afch.find( '#newWikiProjects_chzn' ),
							$input = $( this ),
							newProject = $input.val(),
							$noResults = $chzn.find( 'li.no-results' );

						// Only show "Add {{PROJECT}}" link if there are no results
						if ( $noResults.length ) {
							$( '<div>' )
								.appendTo( $noResults.empty() )
								.text( 'Whoops, no WikiProjects matched in database! ' )
								.append(
									$( '<a>' )
										.text( 'Click to manually add {{' + newProject + '}} to the page\'s WikiProject list.' )
										.on( 'click', () => {
											const $wikiprojects = $afch.find( '#newWikiProjects' );

											$( '<option>' )
												.attr( 'value', newProject )
												.attr( 'selected', true )
												.text( newProject )
												.appendTo( $wikiprojects );

											$wikiprojects.trigger( 'liszt:updated' );
											$input.val( '' );
										} )
								);
						}
					} );

					$afch.find( '#newCategories' ).chosen( {
						placeholder_text_multiple: 'Start typing to add categories...',
						width: '350px'
					} );

					// Offer dynamic category suggestions!
					// Since jquery.chosen doesn't natively support dynamic results,
					// we sneakily inject some dynamic suggestions instead. Consider
					// switching to something like Select2 to avoid this hackery...
					$afch.find( '#newCategories_chosen input' ).on( 'keyup', function ( e ) {
						const $input = $( this ),
							prefix = $input.val(),
							$categories = $afch.find( '#newCategories' );

						// Ignore up/down keys to allow users to navigate through the suggestions,
						// and don't show results when an empty string is provided
						if ( [ 38, 40 ].indexOf( e.which ) !== -1 || !prefix ) {
							return;
						}

						// The worst hack. Because Chosen keeps messing with the
						// width of the text box, keep on resetting it to 100%
						$input.css( 'width', '100%' );
						$input.parent().css( 'width', '100%' );

						AFCH.api.getCategoriesByPrefix( prefix ).done( ( categories ) => {

							// Reset the text box width again
							$input.css( 'width', '100%' );
							$input.parent().css( 'width', '100%' );

							// If the input has changed since we started searching,
							// don't show outdated results
							if ( $input.val() !== prefix ) {
								return;
							}

							// Clear existing suggestions
							$categories.children().not( ':selected' ).remove();

							// Now, add the new suggestions
							$.each( categories, ( _, category ) => {
								$( '<option>' )
									.attr( 'value', category )
									.text( category )
									.appendTo( $categories );
							} );

							// We've changed the <select>, now tell Chosen to
							// rebuild the visible list
							$categories.trigger( 'liszt:updated' );
							$categories.trigger( 'chosen:updated' );
							$input.val( prefix );
							$input.css( 'width', '100%' );
							$input.parent().css( 'width', '100%' );
						} );
					} );

					// Show bio options if Biography option checked
					$afch.find( '#isBiography' ).on( 'change', function () {
						$afch.find( '#bioOptionsWrapper' ).toggleClass( 'hidden', !this.checked );
					} );
					if ( alreadyHasWPBio ) {
						$afch.find( '#isBiography' ).prop( 'checked', true ).trigger( 'change' );
					}

					function prefillBiographyDetails() {
						let titleParts;

						// Prefill `LastName, FirstName` for Biography if the page title is two words
						// after removing any trailing parentheticals (likely disambiguation), and
						// therefore probably safe to asssume in a `FirstName LastName` format.
						const title = afchSubmission.shortTitle.replace( / \([\s\S]*?\)$/g, '' );
						titleParts = title.split( ' ' );
						if ( titleParts.length === 2 ) {
							$afch.find( '#subjectName' ).val( titleParts[ 1 ] + ', ' + titleParts[ 0 ] );
						}
					}
					prefillBiographyDetails();

					// If subject is dead, show options for death details
					$afch.find( '#lifeStatus' ).on( 'change', function () {
						$afch.find( '#deathWrapper' ).toggleClass( 'hidden', $( this ).val() !== 'dead' );
					} );

					// Show an error if the page title already exists in the mainspace,
					// or if the title is create-protected and user is not an admin
					$afch.find( '#newTitle' ).on( 'keyup', function () {
						let page,
							linkToPage,
							$field = $( this ),
							$status = $afch.find( '#titleStatus' ),
							$submitButton = $afch.find( '#afchSubmitForm' ),
							value = $field.val();

						// Reset to a pure state
						$field.removeClass( 'bad-input' );
						$status.text( '' );
						$submitButton
							.removeClass( 'disabled' )
							.css( 'pointer-events', 'auto' )
							.text( 'Accept & publish' );

						// If there is no value, die now, because otherwise mw.Title
						// will throw an exception due to an invalid title
						if ( !value ) {
							return;
						}
						page = new AFCH.Page( value );
						linkToPage = AFCH.jQueryToHtml( AFCH.makeLinkElementToPage( page.rawTitle ) );

						AFCH.api.get( {
							action: 'query',
							titles: 'Talk:' + page.rawTitle
						} ).done( ( data ) => {
							if ( !data.query.pages.hasOwnProperty( '-1' ) ) {
								$status.html( 'The talk page for "' + linkToPage + '" exists.' );
							}
						} );

						$.when(
							AFCH.api.get( {
								action: 'titleblacklist',
								tbtitle: page.rawTitle,
								tbaction: 'create',
								tbnooverride: true
							} ),
							AFCH.api.get( {
								action: 'query',
								prop: 'info',
								inprop: 'protection',
								titles: page.rawTitle
							} )
						).then( ( rawBlacklist, rawInfo ) => {
							let errorHtml, buttonText;

							// Get just the result, not the Promise object
							let blacklistResult = rawBlacklist[ 0 ],
								infoResult = rawInfo[ 0 ];

							const pageAlreadyExists = !infoResult.query.pages.hasOwnProperty( '-1' );

							const pages = infoResult && infoResult.query && infoResult.query.pages && infoResult.query.pages;
							const firstPageInObject = Object.values( pages )[ 0 ];
							const pageIsRedirect = firstPageInObject && ( 'redirect' in firstPageInObject );

							if ( pageAlreadyExists && pageIsRedirect ) {
								const linkToRedirect = AFCH.jQueryToHtml( AFCH.makeLinkElementToPage( page.rawTitle, null, null, true ) );
								errorHtml = '<br />Whoops, the page "' + linkToRedirect + '" already exists and is a redirect. <span id="afch-redirect-notification">Do you want to tag it for speedy deletion so you can accept this draft later? <a id="afch-redirect-tag-speedy">Yes</a> / <a id="afch-redirect-abort">No</a></span>';
								buttonText = 'The proposed title already exists';
							} else if ( pageAlreadyExists ) {
								errorHtml = 'Whoops, the page "' + linkToPage + '" already exists.';
								buttonText = 'The proposed title already exists';
							} else {
								// If the page doesn't exist but IS create-protected and the
								// current reviewer is not an admin, also display an error
								// FIXME: offer one-click request unprotection?
								$.each( infoResult.query.pages[ '-1' ].protection, ( _, entry ) => {
									if ( entry.type === 'create' && entry.level === 'sysop' && $.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) === -1 ) {
										const linkToRfup = AFCH.jQueryToHtml( AFCH.makeLinkElementToPage( 'WP:RFUP' ) );
										errorHtml = 'Darn it, "' + linkToPage + '" is create-protected. You will need to request unprotection from the protecting admin on their talk page or at ' + linkToRfup + '.';
										buttonText = 'The proposed title is create-protected';
									}
								} );
							}

							// Now check the blacklist result, but if another error already exists,
							// don't bother showing this one too
							blacklistResult = blacklistResult.titleblacklist;
							if ( !errorHtml && blacklistResult.result === 'blacklisted' ) {
								errorHtml = 'Shoot! ' + blacklistResult.reason.replace( /\s+/g, ' ' );
								buttonText = 'The proposed title is blacklisted';
							}

							if ( !errorHtml ) {
								return;
							}

							// Add a red border around the input field
							$field.addClass( 'bad-input' );

							// Show the error message
							$status.html( errorHtml );

							// Add listener for the "Do you want to tag it for speedy deletion so you can accept this draft later?" "yes" link.
							$( '#afch-redirect-tag-speedy' ).on( 'click', () => {
								handleAcceptOverRedirect( page.rawTitle );
							} );

							// Add listener for the "Do you want to tag it for speedy deletion so you can accept this draft later?" "no" link.
							$( '#afch-redirect-abort' ).on( 'click', () => {
								$( '#afch-redirect-notification' ).hide();
							} );

							// Disable the submit button and show an error in its place
							$submitButton
								.addClass( 'disabled' )
								.css( 'pointer-events', 'none' )
								.text( buttonText );
						} );
					} );

					// Update titleStatus
					$afch.find( '#newTitle' ).trigger( 'keyup' );

				} );

				addFormSubmitHandler( handleAccept, {
					existingWikiProjects: existingWikiProjects,
					alreadyHasWPBio: alreadyHasWPBio,
					existingShortDescription: shortDescription
				} );
			} );
		}

		function showDeclineOptions() {
			loadView( 'decline', {}, () => {
				let $reasons, $commonSection, declineCounts,
					pristineState = $afch.find( '#declineInputWrapper' ).html();

				// pos is either 1 or 2, based on whether the chosen reason that
				// is triggering this update is first or second in the multi-select
				// control
				function updateTextfield( newPrompt, newPlaceholder, newValue, pos ) {
					const $wrapper = $afch.find( '#textfieldWrapper' + ( pos === 2 ? '2' : '' ) );

					// Update label and placeholder
					$wrapper.find( 'label' ).text( newPrompt );
					$wrapper.find( 'input' ).attr( 'placeholder', newPlaceholder );

					// Update default textfield value (perhaps)
					if ( typeof newValue !== 'undefined' ) {
						$wrapper.find( 'input' ).val( newValue );
					}

					// And finally show the textfield
					$wrapper.removeClass( 'hidden' );
				}

				// Copy most-used options to top of decline dropdown

				declineCounts = AFCH.userData.get( 'decline-counts', false );

				if ( declineCounts ) {
					const declineList = $.map( declineCounts, ( _, key ) => key );

					// Sort list in descending order (most-used at beginning)
					declineList.sort( ( a, b ) => declineCounts[ b ] - declineCounts[ a ] );

					$reasons = $afch.find( '#declineReason' );
					$commonSection = $( '<optgroup>' )
						.attr( 'label', 'Frequently used' )
						.insertBefore( $reasons.find( 'optgroup' ).first() );

					// Show the 5 most used options
					$.each( declineList.splice( 0, 5 ), ( _, rationale ) => {
						const $relevant = $reasons.find( 'option[value="' + rationale + '"]' );
						$relevant.clone( true ).appendTo( $commonSection );
					} );
				}

				// Set up jquery.chosen for the decline reason
				$afch.find( '#declineReason' ).chosen( {
					placeholder_text_multiple: 'Select one or more decline reasons...',
					no_results_text: 'Whoops, no reasons matched your search. Type "custom" to add a custom rationale instead.',
					search_contains: true,
					inherit_select_classes: true,
					max_selected_options: 2
				} );

				// Set up jquery.chosen for the reject reason
				$afch.find( '#rejectReason' ).chosen( {
					placeholder_text_multiple: 'Select one or more reject reasons...',
					search_contains: true,
					inherit_select_classes: true,
					max_selected_options: 2
				} );

				// rejectReason starts off hidden by default, which makes the _chosen div
				// display at 0px wide for some reason. We must manually fix this.
				$afch.find( '#rejectReason_chosen' ).css( 'width', '350px' );

				// And now add the handlers for when a specific decline reason is selected
				$afch.find( '#declineReason' ).on( 'change', () => {
					const reason = $afch.find( '#declineReason' ).val(),
						candidateDupeName = ( afchSubmission.shortTitle !== 'sandbox' ) ? afchSubmission.shortTitle : '',
						prevDeclineComment = $afch.find( '#declineTextarea' ).val(),
						declineHandlers = {
							cv: function () {
								$afch.find( '#cvUrlWrapper' ).removeClass( 'hidden' );
								$afch.add( '#csdWrapper' ).removeClass( 'hidden' );

								$afch.find( '#cvUrlTextarea' ).on( 'keyup', function () {
									let text = $( this ).val(),
										numUrls = text ? text.split( '\n' ).length : 0,
										$submitButton = $afch.find( '#afchSubmitForm' );
									if ( numUrls >= 1 && numUrls <= 3 ) {
										$( this ).removeClass( 'bad-input' );
										$submitButton
											.removeClass( 'disabled' )
											.css( 'pointer-events', 'auto' )
											.text( 'Decline submission' );
									} else {
										$( this ).addClass( 'bad-input' );
										$submitButton
											.addClass( 'disabled' )
											.css( 'pointer-events', 'none' )
											.text( 'Please enter between one and three URLs!' );
									}
								} );

								// Check if there's an OTRS notice
								new AFCH.Page( 'Draft talk:' + afchSubmission.shortTitle ).getText( /* usecache */ false ).done( ( text ) => {
									if ( /ConfirmationOTRS/.test( text ) ) {
										$afch.find( '#declineInputWrapper' ).append(
											$( '<div>' )
												.addClass( 'warnings' )
												.css( {
													'max-width': '50%',
													margin: '0px auto'
												} )
												.text( 'This draft has an OTRS template on the talk page. Verify that the copyright violation isn\'t covered by the template before marking this draft as a copyright violation.' ) );
									}
								} );
							},

							dup: function ( pos ) {
								updateTextfield( 'Title of duplicate submission (no namespace)', 'Articles for creation/Fudge', candidateDupeName, pos );
							},

							mergeto: function ( pos ) {
								updateTextfield( 'Article which submission should be merged into', 'Milkshake', candidateDupeName, pos );
							},

							lang: function ( pos ) {
								updateTextfield( 'Language of the submission if known', 'German', '', pos );
							},

							exists: function ( pos ) {
								updateTextfield( 'Title of existing article', 'Chocolate chip cookie', candidateDupeName, pos );
							},

							plot: function ( pos ) {
								updateTextfield( 'Title of existing related article, if one exists', 'Charlie and the Chocolate Factory', candidateDupeName, pos );
							},

							// Custom decline rationale
							reason: function () {
								$afch.find( '#declineTextarea' )
									.attr( 'placeholder', 'Enter your decline reason here using wikicode syntax.' );
							}
						};

					// Reset to a pristine state :)
					$afch.find( '#declineInputWrapper' ).html( pristineState );

					// If there are special options to be displayed for each
					// particular decline reason, load them now
					if ( declineHandlers[ reason[ 0 ] ] ) {
						declineHandlers[ reason[ 0 ] ]( 1 );
					}
					if ( declineHandlers[ reason[ 1 ] ] ) {
						declineHandlers[ reason[ 1 ] ]( 2 );
					}

					// Preserve the custom comment text
					$afch.find( '#declineTextarea' ).val( prevDeclineComment );

					// If the user wants a preview, show it
					if ( $( '#previewTrigger' ).text() == '(hide preview)' ) {
						$( '#previewContainer' )
							.empty()
							.append( $.createSpinner( {
								size: 'large',
								type: 'block'
							} ).css( 'padding', '20px' ) );
						AFCH.getReason( reason ).done( ( html ) => {
							$( '#previewContainer' ).html( html );
						} );
					}

					// If a reason has been specified, show the textarea, notify
					// option, and the submit form button
					$afch.find( '#declineTextarea' ).add( '#declineNotifyWrapper' ).add( '#afchSubmitForm' )
						.toggleClass( 'hidden', !reason || !reason.length )
						.on( 'keyup', mw.util.debounce( 500, () => {
							previewComment( $( '#declineTextarea' ), $( '#declineInputPreview' ) );
						} ) );
				} ); // End change handler for the decline reason select box

				// And the the handlers for when a specific REJECT reason is selected
				$afch.find( '#rejectReason' ).on( 'change', () => {
					const reason = $afch.find( '#rejectReason' ).val();

					// If a reason has been specified, show the textarea, notify
					// option, and the submit form button
					$afch.find( '#rejectTextarea' ).add( '#rejectNotifyWrapper' ).add( '#afchSubmitForm' )
						.toggleClass( 'hidden', !reason || !reason.length )
						.on( 'keyup', mw.util.debounce( 500, () => {
							previewComment( $( '#rejectTextarea' ), $( '#rejectInputPreview' ) );
						} ) );
				} ); // End change handler for the reject reason select box

				// Attach the preview event listener
				$afch.find( '#previewTrigger' ).on( 'click', function () {
					const reason = $afch.find( '#declineReason' ).val();
					if ( this.textContent == '(preview)' && reason ) {
						$( '#previewContainer' )
							.empty()
							.append( $.createSpinner( {
								size: 'large',
								type: 'block'
							} ).css( 'padding', '20px' ) );
						const reasonDeferreds = reason.map( AFCH.getReason );
						$.when.apply( $, reasonDeferreds ).then( function () {
							$( '#previewContainer' )
								.html( Array.prototype.slice.call( arguments )
									.join( '<hr />' ) );
						} );
						this.textContent = '(hide preview)';
					} else {
						$( '#previewContainer' ).empty();
						this.textContent = '(preview)';
					}
				} );

				// Attach the decline vs reject radio button listener
				$afch.find( 'input[type=radio][name=declineReject]' ).on( 'click', () => {
					const declineOrReject = $afch.find( 'input[name=declineReject]:checked' ).val();
					$afch.find( '#declineReasonWrapper' ).toggleClass( 'hidden', declineOrReject === 'reject' );
					$afch.find( '#rejectReasonWrapper' ).toggleClass( 'hidden', declineOrReject === 'decline' );
					$afch.find( '#declineInputWrapper' ).toggleClass( 'hidden', declineOrReject === 'reject' );
					$afch.find( '#rejectInputWrapper' ).toggleClass( 'hidden', declineOrReject === 'decline' );
					$afch.find( '#declineNotifyWrapper' ).toggleClass( 'hidden2', declineOrReject === 'reject' );
					$afch.find( '#rejectNotifyWrapper' ).toggleClass( 'hidden2', declineOrReject === 'decline' );
				} );
			} ); // End loadView callback

			addFormSubmitHandler( handleDecline );
		}

		function previewComment( $textarea, $previewArea ) {
			const commentText = $textarea.val();
			if ( commentText ) {
				AFCH.api.parse( '{{AfC comment|1=' + AFCH.addSignature( commentText ) + '}}', {
					pst: true,
					title: mw.config.get( 'wgPageName' )
				} ).then( ( html ) => {
					$previewArea.html( html );
				} );
			} else {
				$previewArea.html( '' );
			}
		}

		function showCommentOptions() {
			loadView( 'comment', {} );

			const $submitButton = $( '#afchSubmitForm' );
			$submitButton.hide();

			$( '#commentText' ).on( 'keyup', mw.util.debounce( 500, () => {
				previewComment( $( '#commentText' ), $( '#commentPreview' ) );

				// Hide the submit button if there is no comment typed in
				const comment = $( '#commentText' ).val();
				if ( comment.length > 0 ) {
					$submitButton.show();
				} else {
					$submitButton.hide();
				}
			} ) );

			addFormSubmitHandler( handleComment );
		}

		function showSubmitOptions() {
			const customSubmitters = [];

			// Iterate over the submitters and add them to the custom submitters list,
			// displayed in the "submit as" dropdown.
			$.each( afchSubmission.submitters, ( index, submitter ) => {
				customSubmitters.push( {
					name: submitter,
					description: submitter + ( index === 0 ? ' (most recent submitter)' : ' (past submitter)' ),
					selected: index === 0
				} );
			} );

			loadView( 'submit', {
				customSubmitters: customSubmitters
			}, () => {

				// Reset the status indicators for the username & errors
				function resetStatus() {
					$afch.find( '#submitterName' ).removeClass( 'bad-input' );
					$afch.find( '#submitterNameStatus' ).text( '' );
					$afch.find( '#afchSubmitForm' )
						.removeClass( 'disabled' )
						.css( 'pointer-events', 'auto' )
						.text( 'Submit' );
				}

				// Show the other textbox when `other` is selected in the menu
				$afch.find( '#submitType' ).on( 'change', () => {
					const isOtherSelected = $afch.find( '#submitType' ).val() === 'other';

					if ( isOtherSelected ) {
						$afch.find( '#submitterNameWrapper' ).removeClass( 'hidden' );
						$afch.find( '#submitterName' ).trigger( 'keyup' );
					} else {
						$afch.find( '#submitterNameWrapper' ).addClass( 'hidden' );
					}

					resetStatus();

					// Show an error if there's no such user
					$afch.find( '#submitterName' ).on( 'keyup', function () {
						const $field = $( this ),
							$status = $( '#submitterNameStatus' ),
							$submitButton = $afch.find( '#afchSubmitForm' ),
							submitter = $field.val();

						// Reset form
						resetStatus();

						// If there's no value, don't even try
						if ( !submitter || !isOtherSelected ) {
							return;
						}

						// Check if the user string starts with "User:", because Template:AfC submission dies horribly if it does
						if ( submitter.lastIndexOf( 'User:', 0 ) === 0 ) {
							$field.addClass( 'bad-input' );
							$status.text( 'Remove "User:" from the beginning.' );
							$submitButton
								.addClass( 'disabled' )
								.css( 'pointer-events', 'none' )
								.text( 'Invalid user name' );
							return;
						}

						// Check if there is such a user
						AFCH.api.get( {
							action: 'query',
							list: 'users',
							ususers: submitter
						} ).done( ( data ) => {
							if ( data.query.users[ 0 ].missing !== undefined ) {
								$field.addClass( 'bad-input' );
								$status.text( 'No user named "' + submitter + '".' );
								$submitButton
									.addClass( 'disabled' )
									.css( 'pointer-events', 'none' )
									.text( 'No such user' );
							}
						} );
					} );
				} );
			} );

			addFormSubmitHandler( handleSubmit );
		}

		function showPostponeG13Options() {
			loadView( 'postpone-g13', {} );
			addFormSubmitHandler( handlePostponeG13 );
		}

		this.showAcceptOptions = showAcceptOptions;
		this.showDeclineOptions = showDeclineOptions;
		this.showCommentOptions = showCommentOptions;
		this.showSubmitOptions = showSubmitOptions;
		this.showPostponeG13Options = showPostponeG13Options;
	};
}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
