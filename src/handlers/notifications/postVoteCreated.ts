import { upsertGroupedNotification } from '../../lib/notifications';
import { PostVoteCreatedEvent } from '../../types/post-vote-created';

/**
 * Upvotes on one post (or one comment) collapse into a single notification for its
 * author; each new voter reopens it, and voting again after a retract adds nobody.
 */
export default async function handlePostVoteCreated(event: PostVoteCreatedEvent) {
  const payload = event.payload;

  if (payload.value !== 1) return;

  const isGuessComment = payload.commentType === 'gps-guess-comment' || payload.commentType === 'gps-photo-guess-comment';

  const details = {
    postId: payload.postId,
    commentId: payload.commentId ?? null,
    targetType: isGuessComment ? 'guess-comment' : payload.commentId ? 'comment' : 'post',
    value: payload.value,
    voterId: payload.voterId,
    voterAlias: payload.voterAlias,
  };
  const actor = { userId: payload.voterId, alias: payload.voterAlias };

  if (payload.commentId === null || payload.commentId === undefined) {
    if (payload.voterId !== payload.postAuthorId) {
      await upsertGroupedNotification({
        userId: payload.postAuthorId,
        type: 'post-vote-created',
        groupKey: `post-vote:${payload.postId}`,
        actor,
        details,
      });
    }
  } else {
    if (payload.commentAuthorId != null && payload.commentAuthorId !== payload.voterId) {
      await upsertGroupedNotification({
        userId: payload.commentAuthorId,
        type: 'comment-vote-created',
        groupKey: `comment-vote:${payload.commentId}`,
        actor,
        details,
      });
    }
  }
}
