import { createNotification } from '../../lib/notifications';
import { PostVoteCreatedEvent } from '../../types/post-vote-created';

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

  if (payload.commentId === null || payload.commentId === undefined) {
    if (payload.voterId !== payload.postAuthorId) {
      await createNotification(payload.postAuthorId, 'post-vote-created', details);
    }
  } else {
    if (payload.commentAuthorId != null && payload.commentAuthorId !== payload.voterId) {
      await createNotification(payload.commentAuthorId, 'comment-vote-created', details);
    }
  }
}
