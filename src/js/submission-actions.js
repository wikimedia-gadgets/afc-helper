// <nowiki>
( function ( AFCH, $, mw ) {
	/**
	 * Creates action handlers for a submission review panel.
	 *
	 * @param {Object} dependencies
	 * @param {jQuery} dependencies.$afch Review panel element
	 * @param {AFCH.Page} dependencies.page Submission page
	 * @param {AFCH.Submission} dependencies.submission Parsed submission
	 * @param {Function} dependencies.prepareForProcessing
	 * @constructor
	 */
	AFCH.SubmissionActions = function ( dependencies ) {
		const $afch = dependencies.$afch;
		const afchPage = dependencies.page;
		const afchSubmission = dependencies.submission;
		const prepareForProcessing = dependencies.prepareForProcessing;

		// These functions perform a given action using data passed in the `data` parameter.

		function handleAcceptOverRedirect( destinationPageTitle ) {
			// get rid of the accept form. replace it with the status div.
			prepareForProcessing();

			// Add {{Db-afc-move}} speedy deletion tag to redirect, and add to watchlist
			( new AFCH.Page( destinationPageTitle ) ).edit( {
				contents: '{{Db-afc-move|' + afchPage.rawTitle + '}}\n\n',
				mode: 'prependtext',
				summary: 'Requesting speedy deletion ([[Wikipedia:CSD#G6|CSD G6]]).',
				statusText: 'Tagging',
				watchlist: 'watch'
			} );

			// Mark the draft as under review.
			afchPage.getText( false ).then( ( rawText ) => {
				const text = new AFCH.Text( rawText );
				afchSubmission.setStatus( 'r', {
					reviewer: AFCH.consts.user,
					reviewts: '{{subst:REVISIONTIMESTAMP}}'
				} );
				text.updateAfcTemplates( afchSubmission.makeWikicode() );
				text.cleanUp();
				afchPage.edit( {
					contents: text.get(),
					summary: 'Marking submission as under review',
					statusText: 'Marking as under review'
				} );
			} );
		}

		function getBiographyCategories( birthYear, deathYear, lifeStatus ) {
			const birth = birthYear.trim(),
				categories = [];
			let death = 'LIVING';
			if ( lifeStatus === 'dead' ) {
				death = ( deathYear || 'MISSING' ).trim();
			} else if ( lifeStatus === 'unknown' ) {
				death = 'UNKNOWN';
			}

			const birthStatus = birth.toUpperCase(),
				deathStatus = death.toUpperCase();
			if ( [ '', 'UNKNOWN', 'MISSING' ].includes( birthStatus ) ) {
				categories.push( 'Year of birth missing' +
					( [ '', 'LIVING' ].includes( deathStatus ) ? ' (living people)' : '' ) );
			} else {
				categories.push( birth + ' births' );
			}

			if ( [ '', 'LIVING' ].includes( deathStatus ) ) {
				categories.push( 'Living people' );
			} else if ( deathStatus === 'MISSING' ) {
				categories.push( 'Year of death missing' );
			} else if ( deathStatus !== 'UNKNOWN' ) {
				categories.push( death + ' deaths' );
			}

			return categories;
		}

		function getBiographyDefaultSort( name ) {
			const subjectName = name.trim();
			return subjectName ? '{{DEFAULTSORT:' + subjectName + '}}' : null;
		}

		function getUniqueCategories( categories ) {
			const seenCategories = new Set();
			return categories.filter( ( category ) => {
				let name = category.split( '|' )[ 0 ].replace( /_/g, ' ' ).replace( /\s+/g, ' ' ).trim();
				name = name.charAt( 0 ).toUpperCase() + name.slice( 1 );
				if ( seenCategories.has( name ) ) {
					return false;
				}
				seenCategories.add( name );
				return true;
			} );
		}

		function handleAccept( data ) {
			let newText = data.afchText;
			const categories = ( data.newCategories || [] ).slice();
			let defaultSort = null;
			if ( data.isBiography ) {
				categories.push( ...getBiographyCategories( data.birthYear, data.deathYear, data.lifeStatus ) );
				defaultSort = getBiographyDefaultSort( data.subjectName );
			}
			const uniqueCategories = getUniqueCategories( categories );

			AFCH.actions.movePage( afchPage.rawTitle, data.newTitle,
				'Publishing accepted [[Wikipedia:Articles for creation|Articles for creation]] submission',
				{ movetalk: true } ) // Also move associated talk page if exists (e.g. `Draft_talk:`)
				.done( ( moveData ) => {
					let $patrolLink,
						newPage = new AFCH.Page( moveData.to ),
						talkPage = newPage.getTalkPage(),
						recentPage = new AFCH.Page( 'Wikipedia:Articles for creation/recent' );

					// ARTICLE
					// -------

					// get comments left by reviewers to put on talk page
					let comments = [];
					if ( data.copyComments ) {
						comments = newText.getAfcComments();
					}

					newText.removeAfcTemplates();

					newText.updateShortDescription( data.existingShortDescription, data.shortDescription );

					// Clean the page
					newText.cleanUp( /* isAccept */ true );

					if ( defaultSort ) {
						newText.append( '\n' + defaultSort );
					}
					newText.updateCategories( uniqueCategories );

					// Stub sorting
					newText = newText.get();
					if ( typeof window.StubSorter_create_edit === 'function' ) {
						newText = window.StubSorter_create_edit( newText, data[ 'stub-sorter-select' ] || [] ).text;
					}

					if ( newPage.title.getNamespaceId() === 0 ) {
						const articleText = new AFCH.Text( newText );
						articleText.addUncategorizedTag();
						newText = articleText.get();
					}
					newPage.edit( {
						contents: newText,
						summary: 'Cleaning up accepted [[Wikipedia:Articles for creation|Articles for creation]] submission'
					} );

					// Patrol the new page if desired
					if ( data.patrolPage ) {
						$patrolLink = $afch.find( '.patrollink' );
						if ( $patrolLink.length ) {
							AFCH.actions.patrolRcid(
								mw.util.getParamValue( 'rcid', $patrolLink.find( 'a' ).attr( 'href' ) ),
								newPage.rawTitle // Include the title for a prettier log message
							);
						}
					}

					// TALK PAGE
					// ---------

					talkPage.getText().done( ( talkText ) => {
						const selectedWikiProjects = data.newWikiProjects || [];
						const removedWikiProjects = data.existingWikiProjects
							.filter( ( project ) => !selectedWikiProjects.includes( project.templateName ) )
							.map( ( project ) => project.templateName );
						talkText = AFCH.addTalkPageBanners(
							talkText,
							data.newAssessment,
							afchPage.additionalData.revId,
							data.isBiography,
							selectedWikiProjects,
							data.lifeStatus,
							data.subjectName,
							removedWikiProjects
						);

						const summary = 'Placing WikiProject banners';

						if ( comments && comments.length > 0 ) {
							talkText = talkText.trim() + '\n\n== Comments left by AfC reviewers ==\n' + comments.join( '\n\n' );
						}

						talkPage.edit( {
							contents: talkText,
							summary: summary
						} );
					} );

					// NOTIFY SUBMITTER
					// ----------------

					if ( data.notifyUser ) {
						afchSubmission.getSubmitter().done( ( submitter ) => {
							AFCH.actions.notifyUser( submitter, {
								message: AFCH.msg.get( 'accepted-submission',
									{ $1: newPage, $2: data.newAssessment } ),
								summary: 'Notification: Your [[' + AFCH.consts.pagename + '|Articles for Creation submission]] has been accepted'
							} );
						} );
					}

					// AFC/RECENT
					// ----------

					const reviewer = AFCH.consts.user;
					$.when( recentPage.getText(), afchSubmission.getSubmitter() )
						.then( ( text, submitter ) => {
							let newRecentText = text,
								matches = text.match( /{{afc contrib.*?}}\s*/gi ),
								newTemplate = '{{afc contrib|' + data.newAssessment + '|' + newPage + '|' + submitter + '|' + reviewer + '}}\n';

							// Remove the older entries (at bottom of the page) if necessary
							// to ensure we keep only 10 entries at any given point in time
							while ( matches.length >= 10 ) {
								newRecentText = newRecentText.replace( matches.pop(), '' );
							}

							newRecentText = newTemplate + newRecentText;

							recentPage.edit( {
								contents: newRecentText,
								summary: 'Adding [[' + newPage + ']] to list of recent AfC creations',
								watchlist: 'nochange'
							} );
						} );

					// LOG TO USERSPACE
					// ----------

					afchSubmission.getSubmitter().done( ( submitter ) => {
						AFCH.actions.logAfc( {
							title: afchPage.rawTitle,
							actionType: 'accept',
							submitter: submitter
						} );
					} );
				} );
		}

		function handleDecline( data ) {
			let declineCounts,
				isDecline = data.declineRejectWrapper === 'decline', // true=decline, false=reject
				notifyUser = isDecline ? data.declineNotifyUser : data.rejectNotifyUser,
				text = data.afchText,
				declineReason = data.declineReason[ 0 ],
				declineReason2 = data.declineReason.length > 1 ? data.declineReason[ 1 ] : null,
				newParams = {
					decliner: AFCH.consts.user,
					declinets: '{{subst:REVISIONTIMESTAMP}}'
				};

			if ( isDecline ) {
				newParams[ '2' ] = declineReason;

				// If there's a second reason, add it to the params
				if ( declineReason2 ) {
					newParams.reason2 = declineReason2;
				}
			} else {
				newParams[ '2' ] = data.rejectReason[ 0 ];
				if ( data.rejectReason[ 1 ] ) {
					newParams.reason2 = data.rejectReason[ 1 ];
				}
			}

			// Update decline counts
			declineCounts = AFCH.userData.get( 'decline-counts', {} );

			declineCounts[ declineReason ] = ( declineCounts[ declineReason ] || 1 ) + 1;
			if ( declineReason2 ) {
				declineCounts[ declineReason2 ] = ( declineCounts[ declineReason2 ] || 1 ) + 1;
			}

			AFCH.userData.set( 'decline-counts', declineCounts );

			// If the first reason is a custom decline, we include the declineTextarea in the {{AfC submission}} template
			if ( declineReason === 'reason' ) {
				newParams[ '3' ] = data.declineTextarea;
			} else if ( declineReason2 === 'reason' ) {
				newParams.details2 = data.declineTextarea;
			} else if ( isDecline && data.declineTextarea ) {

				// But otherwise if addtional text has been entered we just add it as a new comment
				afchSubmission.addNewComment( data.declineTextarea );
			}

			// If a user has entered something in the declineTextfield (for example, a URL or an
			// associated page), pass that as the third parameter...
			if ( data.declineTextfield ) {
				newParams[ '3' ] = data.declineTextfield;
			}

			// ...and do the same with the second decline text field
			if ( data.declineTextfield2 ) {
				newParams.details2 = data.declineTextfield2;
			}

			// If we're rejecting, any text in the text area is a comment
			if ( !isDecline && data.rejectTextarea ) {
				afchSubmission.addNewComment( data.rejectTextarea );
			}

			// Copyright violations get {{db-g12}}'d as well
			if ( declineReason === 'cv' || declineReason2 === 'cv' ) {
				let cvUrls = data.cvUrlTextarea.split( '\n' ).slice( 0, 3 ),
					urlParam = '';

				if ( data.csdSubmission ) {
					// Build url param for db-g12 template
					urlParam = cvUrls[ 0 ];
					if ( cvUrls.length > 1 ) {
						urlParam += '|url2=' + cvUrls[ 1 ];
						if ( cvUrls.length > 2 ) {
							urlParam += '|url3=' + cvUrls[ 2 ];
						}
					}
					text.prepend( '{{db-g12|url=' + urlParam + ( afchPage.additionalData.revId ? '|oldid=' + afchPage.additionalData.revId : '' ) + '}}\n' );
				}

				// Include the URLs in the decline template
				if ( declineReason === 'cv' ) {
					newParams[ '3' ] = cvUrls.join( ', ' );
				} else {
					newParams.details2 = cvUrls.join( ', ' );
				}
			}

			if ( !isDecline ) {
				newParams.reject = 'yes';
			}

			// Now update the submission status
			afchSubmission.setStatus( 'd', newParams );

			text.updateAfcTemplates( afchSubmission.makeWikicode() );
			text.cleanUp();

			// Build edit summary
			let editSummary = ( isDecline ? 'Declining' : 'Rejecting' ) + ' submission: ',
				lengthLimit = declineReason2 ? 120 : 180;
			if ( declineReason === 'reason' ) {

				// If this is a custom decline, use the text in the edit summary
				editSummary += data.declineTextarea.substring( 0, lengthLimit );

				// If we had to trunucate, indicate that
				if ( data.declineTextarea.length > lengthLimit ) {
					editSummary += '...';
				}
			} else {
				editSummary += isDecline ? data.declineReasonTexts[ 0 ] : data.rejectReasonTexts[ 0 ];
			}

			if ( declineReason2 ) {
				editSummary += ' and ';
				if ( declineReason2 === 'reason' ) {
					editSummary += data.declineTextarea.substring( 0, lengthLimit );
					if ( data.declineTextarea.length > lengthLimit ) {
						editSummary += '...';
					}
				} else {
					editSummary += data.declineReasonTexts[ 1 ];
				}
			}

			afchPage.edit( {
				contents: text.get(),
				summary: editSummary
			} );

			if ( notifyUser ) {
				afchSubmission.getSubmitter().done( ( submitter ) => {
					const userTalk = new AFCH.Page( ( new mw.Title( submitter, 3 ) ).getPrefixedText() ),
						shouldTeahouse = data.inviteToTeahouse && isDecline ? $.Deferred() : false;

					// Check categories on the page to ensure that if the user has already been
					// invited to the Teahouse, we don't invite them again.
					if ( shouldTeahouse ) {
						userTalk.getCategories( /* useApi */ true ).done( ( categories ) => {
							let hasTeahouseCat = false,
								teahouseCategories = [
									'Category:Wikipedians who have received a Teahouse invitation',
									'Category:Wikipedians who have received a Teahouse invitation through AfC'
								];

							$.each( categories, ( _, cat ) => {
								if ( teahouseCategories.indexOf( cat ) !== -1 ) {
									hasTeahouseCat = true;
									return false;
								}
							} );

							shouldTeahouse.resolve( !hasTeahouseCat );
						} );
					}

					$.when( shouldTeahouse ).then( ( teahouse ) => {
						let message;
						if ( isDecline ) {
							message = AFCH.msg.get( 'declined-submission', {
								$1: AFCH.consts.pagename,
								$2: afchSubmission.shortTitle,
								$3: ( declineReason === 'cv' || declineReason2 === 'cv' ) ?
									'yes' : 'no',
								$4: declineReason,
								$5: newParams[ '3' ] || '',
								$6: declineReason2 || '',
								$7: newParams.details2 || '',
								$8: ( declineReason === 'reason' || declineReason2 === 'reason' ) ?
									'' : data.declineTextarea
							} );
						} else {
							message = AFCH.msg.get( 'rejected-submission', {
								$1: AFCH.consts.pagename,
								$2: afchSubmission.shortTitle,
								$3: data.rejectReason[ 0 ],
								$4: '',
								$5: data.rejectReason[ 1 ] || '',
								$6: '',
								$7: data.rejectTextarea
							} );
						}

						if ( teahouse ) {
							message += '\n\n' + AFCH.msg.get( 'teahouse-invite' );
						}

						AFCH.actions.notifyUser( submitter, {
							message: message,
							summary: 'Notification: Your [[' + AFCH.consts.pagename + '|Articles for Creation submission]] has been ' + ( isDecline ? 'declined' : 'rejected' )
						} );
					} );
				} );
			}

			// Log AfC if enabled and CSD if necessary
			afchSubmission.getSubmitter().done( ( submitter ) => {
				AFCH.actions.logAfc( {
					title: afchPage.rawTitle,
					actionType: isDecline ? 'decline' : 'reject',
					declineReason: declineReason,
					declineReason2: declineReason2,
					submitter: submitter
				} );

				if ( data.csdSubmission ) {
					AFCH.actions.logCSD( {
						title: afchPage.rawTitle,
						reason: declineReason === 'cv' ? '[[WP:G12]] ({{tl|db-copyvio}})' :
							'{{tl|db-reason}} ([[WP:AFC|Articles for creation]])',
						usersNotified: notifyUser ? [ submitter ] : []
					} );
				}
			} );
		}

		function checkForEditConflict() {
			// Get timestamp of the revision currently loaded in the browser
			return AFCH.api.get( {
				action: 'query',
				format: 'json',
				prop: 'revisions',
				revids: mw.config.get( 'wgCurRevisionId' ),
				formatversion: 2
			} ).then( ( data ) => {
				// convert timestamp format from 2024-05-03T09:40:20Z to 1714729221
				const currentRevisionTimestampTZ = data.query.pages[ 0 ].revisions[ 0 ].timestamp;
				let currentRevisionSeconds = ( new Date( currentRevisionTimestampTZ ).getTime() ) / 1000;

				// add one second. we don't want the current revision to be in our list of revisions
				currentRevisionSeconds++;

				// Then get all revisions since that timestamp
				return AFCH.api.get( {
					action: 'query',
					format: 'json',
					prop: 'revisions',
					titles: [ mw.config.get( 'wgPageName' ) ],
					formatversion: 2,
					rvstart: currentRevisionSeconds,
					rvdir: 'newer',
					rvexcludeuser: mw.config.get( 'wgUserName' )
				} ).then( ( data ) => {
					const revisionsSinceTimestamp = data.query.pages[ 0 ].revisions;
					if ( revisionsSinceTimestamp && revisionsSinceTimestamp.length > 0 ) {
						return true;
					}
					return false;
				} );
			} );
		}

		function showEditConflictMessage() {
			$( '#afchSubmitForm' ).hide();

			// Putting this here instead of in tpl-submissions.html to reduce code duplication
			const editConflictHtml = 'Edit conflict! Your changes were not saved. Please check the <a id="afchHistoryLink" href="">page history</a>. To avoid overwriting the other person\'s edits, please refresh this page and start again.';
			$( '#afchEditConflict' ).html( editConflictHtml );

			const historyLink = new mw.Uri( mw.util.getUrl( mw.config.get( 'wgPageName' ), { action: 'history' } ) );
			$( '#afchHistoryLink' ).prop( 'href', historyLink );

			$( '#afchEditConflict' ).show();
		}

		function handleComment( data ) {
			const text = data.afchText;

			afchSubmission.addNewComment( data.commentText );
			text.updateAfcTemplates( afchSubmission.makeWikicode() );

			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Commenting on submission'
			} );

			if ( data.notifyUser ) {
				afchSubmission.getSubmitter().done( ( submitter ) => {
					AFCH.actions.notifyUser( submitter, {
						message: AFCH.msg.get( 'comment-on-submission',
							{ $1: AFCH.consts.pagename } ),
						summary: 'Notification: I\'ve commented on [[' + AFCH.consts.pagename + '|your Articles for Creation submission]]'
					} );
				} );
			}
		}

		function handleSubmit( data ) {
			const text = data.afchText,
				submitter = $.Deferred(),
				submitType = data.submitType;

			if ( submitType === 'other' ) {
				submitter.resolve( data.submitterName );
			} else if ( submitType === 'self' ) {
				submitter.resolve( AFCH.consts.user );
			} else if ( submitType === 'creator' ) {
				afchPage.getCreator().done( ( user ) => {
					submitter.resolve( user );
				} );
			} else {
				// Custom selected submitter
				submitter.resolve( data.submitType );
			}

			submitter.done( ( submitter ) => {
				afchSubmission.setStatus( '', { u: submitter } );

				text.updateAfcTemplates( afchSubmission.makeWikicode() );
				text.cleanUp();

				afchPage.edit( {
					contents: text.get(),
					summary: 'Submitting'
				} );

			} );

		}

		function handleCleanup() {
			prepareForProcessing( 'Cleaning' );

			afchPage.getText( false ).done( ( rawText ) => {
				const text = new AFCH.Text( rawText );

				// Even though we didn't modify them, still update the templates,
				// because the order may have changed/been corrected
				text.updateAfcTemplates( afchSubmission.makeWikicode() );

				text.cleanUp();

				afchPage.edit( {
					contents: text.get(),
					minor: true,
					summary: 'Cleaning up submission'
				} );
			} );
		}

		function handleMark( unmark ) {
			const actionText = ( unmark ? 'Unmarking' : 'Marking' );

			prepareForProcessing( actionText, 'mark' );

			afchPage.getText( false ).done( ( rawText ) => {
				const text = new AFCH.Text( rawText );

				if ( unmark ) {
					afchSubmission.setStatus( '', { reviewer: false, reviewts: false } );
				} else {
					afchSubmission.setStatus( 'r', {
						reviewer: AFCH.consts.user,
						reviewts: '{{subst:REVISIONTIMESTAMP}}'
					} );
				}

				text.updateAfcTemplates( afchSubmission.makeWikicode() );
				text.cleanUp();

				afchPage.edit( {
					contents: text.get(),
					summary: actionText + ' submission as under review'
				} );
			} );
		}

		function handleG13() {
			// We start getting the creator now (for notification later) because ajax is
			// radical and handles simultaneous requests, but we don't let it delay tagging
			const gotCreator = afchPage.getCreator();

			// Update the display
			prepareForProcessing( 'Requesting', 'g13' );

			// Get the page text and the last modified date (cached!) and tag the page
			$.when(
				afchPage.getText( false ),
				afchPage.getLastModifiedDate()
			).then( ( rawText, lastModified ) => {
				const text = new AFCH.Text( rawText );

				// Add the deletion tag and clean up for good measure
				text.prepend( '{{db-g13|ts=' + AFCH.dateToMwTimestamp( lastModified ) + '}}\n' );
				text.cleanUp();

				afchPage.edit( {
					contents: text.get(),
					summary: 'Tagging abandoned [[Wikipedia:Articles for creation|Articles for creation]] draft ' +
						'for speedy deletion under [[WP:G13|G13]]'
				} );

				// Now notify the page creator as well as any and all previous submitters
				$.when( gotCreator ).then( ( creator ) => {
					const usersToNotify = [ creator ];

					$.each( afchSubmission.submitters, ( _, submitter ) => {
						// Don't notify the same user multiple times
						if ( usersToNotify.indexOf( submitter ) === -1 ) {
							usersToNotify.push( submitter );
						}
					} );

					$.each( usersToNotify, ( _, user ) => {
						AFCH.actions.notifyUser( user, {
							message: AFCH.msg.get( 'g13-submission',
								{ $1: AFCH.consts.pagename } ),
							summary: 'Notification: [[WP:G13|G13]] speedy deletion nomination of [[' + AFCH.consts.pagename + ']]'
						} );
					} );

					// And finally log the CSD nomination once all users have been notified
					AFCH.actions.logCSD( {
						title: afchPage.rawTitle,
						reason: '[[WP:G13]] ({{tl|db-afc}})',
						usersNotified: usersToNotify
					} );
				} );
			} );
		}

		function handlePostponeG13( data ) {
			let postponeCode,
				text = data.afchText,
				rawText = text.get(),
				postponeRegex = /\{\{AfC postpone G13\s*(?:\|\s*(\d*)\s*)?\}\}/ig;
			const match = postponeRegex.exec( rawText );

			// First add the postpone template
			if ( match ) {
				if ( match[ 1 ] !== undefined ) {
					postponeCode = '{{AfC postpone G13|' + ( parseInt( match[ 1 ] ) + 1 ) + '}}';
				} else {
					postponeCode = '{{AfC postpone G13|2}}';
				}
				rawText = rawText.replace( match[ 0 ], postponeCode );
			} else {
				rawText += '\n{{AfC postpone G13|1}}';
			}

			text.set( rawText );

			// Then add the comment if entered
			if ( data.commentText ) {
				afchSubmission.addNewComment( data.commentText );
				text.updateAfcTemplates( afchSubmission.makeWikicode() );
			}

			text.cleanUp();

			afchPage.edit( {
				contents: text.get(),
				summary: 'Postponing [[WP:G13|G13]] speedy deletion'
			} );
		}

		this.handleAcceptOverRedirect = handleAcceptOverRedirect;
		this.handleAccept = handleAccept;
		this.handleDecline = handleDecline;
		this.checkForEditConflict = checkForEditConflict;
		this.showEditConflictMessage = showEditConflictMessage;
		this.handleComment = handleComment;
		this.handleSubmit = handleSubmit;
		this.handleCleanup = handleCleanup;
		this.handleMark = handleMark;
		this.handleG13 = handleG13;
		this.handlePostponeG13 = handlePostponeG13;
	};
}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
