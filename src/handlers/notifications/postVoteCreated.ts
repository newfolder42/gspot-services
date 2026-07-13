import { createNotification } from '../../lib/notifications';
import { PostVoteCreatedEvent } from '../../types/post-vote-created';

export default async function handlePostVoteCreated(event: PostVoteCreatedEvent) {
  const payload = event.payload;

  if (payload.value !== 1) return;

  const details = {
    postId: payload.postId,
    commentId: payload.commentId ?? null,
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
