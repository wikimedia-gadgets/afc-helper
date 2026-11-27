// <nowiki>
( function ( AFCH, $, mw ) {
	/**
	 * Loads warnings about the submission
	 *
	 * @param {Object} options Warning context and unmark callback
	 * @param {AFCH.Page} options.page
	 * @param {AFCH.Submission} options.submission
	 * @param {AFCH.Views} options.views
	 * @param {Function} options.onUnmark
	 * @return {jQuery}
	 */
	AFCH.getSubmissionWarnings = function ( { page: afchPage, submission: afchSubmission, views: afchViews, onUnmark } ) {
		const deferred = $.Deferred(),
			warnings = [];

		/**
		 * Adds a warning
		 *
		 * @param {string} message
		 * @param {string|boolean} actionMessage set to false to hide action link
		 * @param {Function|string} onAction function to call on success, or URL to browse to
		 */
		function addWarning( message, actionMessage, onAction ) {
			let $action,
				$warning = $( '<div>' )
					.addClass( 'afch-warning' )
					.text( message );

			if ( actionMessage !== false ) {
				$action = $( '<a>' )
					.addClass( 'link' )
					.text( '(' + ( actionMessage || 'Edit page' ) + ')' )
					.appendTo( $warning );

				if ( typeof onAction === 'function' ) {
					$action.on( 'click', onAction );
				} else {
					$action
						.attr( 'target', '_blank' )
						.attr( 'href', onAction || mw.util.getUrl( AFCH.consts.pagename, { action: 'edit' } ) );
				}
			}

			warnings.push( $warning );
		}

		function checkReferences() {
			const deferred = $.Deferred();

			afchPage.getText( false ).done( ( text ) => {
				const refBeginRe = /<\s*ref.*?\s*>/ig,
					// If the ref is closed already, we don't want it
					// (returning true keeps the item, false removes it)
					refBeginMatches = $.grep( text.match( refBeginRe ) || [], ( ref ) => ref.indexOf( '/>', ref.length - 2 ) === -1 ),
					refEndRe = /<\/\s*ref\s*>/ig,
					refEndMatches = text.match( refEndRe ) || [],

					reflistRe = /({{(ref(erence)?(\s|-)?list|listaref|refs|footnote|reference|referencias)(?:{{[^{}]*}}|[^}{])*}})|(<\s*references\s*\/?>)/ig,
					hasReflist = reflistRe.test( text ),

					// This isn't as good as a tokenizer, and believes that <ref> foo </b> is
					// completely correct... but it's a good intermediate level solution.
					malformedRefs = text.match( /<\s*ref\s*[^/]*>?<\s*[^/]*\s*ref\s*>/ig ) || [];

				// Uneven (/unclosed) <ref> and </ref> tags
				if ( refBeginMatches.length !== refEndMatches.length ) {
					addWarning( 'The submission contains ' +
						( refBeginMatches.length > refEndMatches.length ? 'unclosed' : 'unbalanced' ) + ' <ref> tags.' );
				}

				// <ref>1<ref> instead of <ref>1</ref> detection
				if ( malformedRefs.length ) {
					addWarning( 'The submission contains malformed <ref> tags.', 'View details', function () {
						const $warningDiv = $( this ).parent();
						const $malformedRefWrapper = $( '<div>' )
							.addClass( 'malformed-refs' )
							.appendTo( $warningDiv );

						// Show the relevant code snippets
						$.each( malformedRefs, ( _, ref ) => {
							$( '<div>' )
								.addClass( 'code-wrapper' )
								.append( $( '<pre>' ).text( ref ) )
								.appendTo( $malformedRefWrapper );
						} );

						// Now change the "View details" link to behave as a normal toggle for .malformed-refs
						AFCH.makeToggle( '.malformed-refs-toggle', '.malformed-refs', 'View details', 'Hide details' );

						return false;
					} );
				}

				// <ref> after {{reflist}}
				if ( hasReflist ) {
					if ( refBeginRe.test( text.substring( reflistRe.lastIndex ) ) ) {
						addWarning( 'Not all of the <ref> tags are before the references list. You may not see all references.' );
					}
				}

				// <ref> without {{reflist}}
				if ( refBeginMatches.length && !hasReflist ) {
					addWarning( 'The submission contains <ref> tags, but has no references list! You may not see all references.' );
				}

				deferred.resolve();
			} );

			return deferred;
		}

		function checkDeletionLog() {
			const deferred = $.Deferred();

			// Don't show deletion notices for "sandbox" to avoid useless
			// information when reviewing user sandboxes and the like
			if ( afchSubmission.shortTitle.toLowerCase() === 'sandbox' ) {
				deferred.resolve();
				return deferred;
			}

			AFCH.api.get( {
				action: 'query',
				list: 'logevents',
				leprop: 'user|timestamp|comment',
				leaction: 'delete/delete',
				letype: 'delete',
				lelimit: 10,
				letitle: afchSubmission.shortTitle
			} ).done( ( data ) => {
				const rawDeletions = data.query.logevents;

				if ( !rawDeletions.length ) {
					deferred.resolve();
					return;
				}

				addWarning( 'The page "' + afchSubmission.shortTitle + '" has been deleted ' + rawDeletions.length + ( rawDeletions.length === 10 ? '+' : '' ) +
					' time' + ( rawDeletions.length > 1 ? 's' : '' ) + '.', 'View deletion log', function () {
					const $toggleLink = $( this ).addClass( 'deletion-log-toggle' ),
						$warningDiv = $toggleLink.parent(),
						deletions = [];

					$.each( rawDeletions, ( _, deletion ) => {
						deletions.push( {
							timestamp: deletion.timestamp,
							relativeTimestamp: AFCH.relativeTimeSince( deletion.timestamp ),
							deletor: deletion.user,
							deletorLink: mw.util.getUrl( 'User:' + deletion.user ),
							reason: AFCH.convertWikilinksToHTML( deletion.comment )
						} );
					} );

					$( afchViews.renderView( 'warning-deletions-table', { deletions: deletions } ) )
						.addClass( 'deletion-log' )
						.appendTo( $warningDiv );

					// ...and now convert the link into a toggle which simply hides/shows the div
					AFCH.makeToggle( '.deletion-log-toggle', '.deletion-log', '(View deletion log)', '(Hide deletion log)' );

					return false;
				} );

				deferred.resolve();

			} );

			return deferred;
		}

		function checkReviewState() {
			let reviewer, isOwnReview;

			if ( afchSubmission.isUnderReview ) {
				isOwnReview = afchSubmission.params.reviewer === AFCH.consts.user;

				if ( isOwnReview ) {
					reviewer = 'You';
				} else {
					reviewer = afchSubmission.params.reviewer || 'Someone';
				}

				addWarning( reviewer + ( afchSubmission.params.reviewts ?
					' began reviewing this submission ' + AFCH.relativeTimeSince( afchSubmission.params.reviewts ) :
					' already began reviewing this submission' ) + '.',
				isOwnReview ? 'Unmark as under review' : 'View page history',
				isOwnReview ? () => {
					onUnmark();
				} : mw.util.getUrl( AFCH.consts.pagename, { action: 'history' } ) );
			}
		}

		function checkLongComments() {
			const deferred = $.Deferred();

			afchPage.getText( false ).done( ( rawText ) => {
				const
					// Simulate cleanUp first so that we don't warn about HTML
					// comments that the script will remove anyway in the future
					text = ( new AFCH.Text( rawText ) ).cleanUp( true ),
					longCommentRegex = /(?:<![ \r\n\t]*--)([^-]|[\r\n]|-[^-]){30,}(?:--[ \r\n\t]*>)?/g,
					longCommentMatches = text.match( longCommentRegex ) || [],
					numberOfComments = longCommentMatches.length,
					oneComment = numberOfComments === 1;

				if ( numberOfComments ) {
					addWarning( 'The page contains ' + ( oneComment ? 'an' : '' ) + ' HTML comment' + ( oneComment ? '' : 's' ) +
						' longer than 30 characters.', 'View comment' + ( oneComment ? '' : 's' ), function () {
						const $toggleLink = $( this ).addClass( 'long-comment-toggle' ),
							$warningDiv = $toggleLink.parent(),
							$commentsWrapper = $( '<div>' )
								.addClass( 'long-comments' )
								.appendTo( $warningDiv );

						// Show the relevant code snippets
						$.each( longCommentMatches, ( _, comment ) => {
							$( '<div>' )
								.addClass( 'code-wrapper' )
								.append( $( '<pre>' ).text( $.trim( comment ) ) )
								.appendTo( $commentsWrapper );
						} );

						// Now change the "View comment" link to behave as a normal toggle for .long-comments
						AFCH.makeToggle( '.long-comment-toggle', '.long-comments',
							'(View comment' + ( oneComment ? '' : 's' ) + ')', '(Hide comment' + ( oneComment ? '' : 's' ) + ')' );

						return false;
					} );
				}

				deferred.resolve();
			} );

			return deferred;
		}

		function checkForCopyvio() {
			return AFCH.api.get( {
				action: 'pagetriagelist',
				page_id: mw.config.get( 'wgArticleId' )
			} ).then( ( json ) => {
				const triageInfo = json.pagetriagelist.pages[ 0 ];
				if ( triageInfo && Number( triageInfo.copyvio ) === mw.config.get( 'wgCurRevisionId' ) ) {
					addWarning(
						'This submission may contain copyright violations',
						'CopyPatrol',
						'https://copypatrol.wmcloud.org/en?filter=all&searchCriteria=page_exact&searchText=' + encodeURIComponent( afchPage.rawTitle ) + '&drafts=1&revision=' + mw.config.get( 'wgCurRevisionId' ), '_blank'
					);
				}
			} );
		}

		function checkForBlocks() {
			return afchSubmission.getSubmitter().then( ( creator ) => checkIfUserIsBlocked( creator ).then( ( blockData ) => {
				if ( blockData !== null ) {
					let date = 'infinity';
					if ( blockData.expiry !== 'infinity' ) {
						const data = new Date( blockData.expiry );
						const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
						date = data.getUTCDate() + ' ' + monthNames[ data.getUTCMonth() ] + ' ' + data.getUTCFullYear() + ' ' + data.getUTCHours() + ':' + data.getUTCMinutes() + ' UTC';
					}
					const warning = 'Submitter ' + creator + ' was blocked by ' + blockData.by + ' with an expiry time of ' + date + '. Reason: ' + blockData.reason;
					addWarning( warning );
				}
			} ) );
		}

		$.when(
			checkReferences(),
			checkDeletionLog(),
			checkReviewState(),
			checkLongComments(),
			checkForCopyvio(),
			checkForBlocks()
		).then( () => {
			deferred.resolve( warnings );
		} );

		return deferred;
	};

	function checkIfUserIsBlocked( userName ) {
		return AFCH.api.get( {
			action: 'query',
			list: 'blocks',
			bkusers: userName
		} ).then( ( data ) => {
			const blocks = data.query.blocks;
			let blockData = null;
			const currentTime = new Date().toISOString();

			for ( let i = 0; i < blocks.length; i++ ) {
				if ( blocks[ i ].expiry === 'infinity' || blocks[ i ].expiry > currentTime ) {
					blockData = blocks[ i ];
					break;
				}
			}

			return blockData;
		} ).catch( ( err ) => {
			console.log( 'abort ' + err );
			return null;
		} );
	}
}( AFCH, jQuery, mediaWiki ) );
// </nowiki>
