import { createNotification } from '../../lib/notifications';
import { PostCommentCreatedEvent } from '../../types/post-comment-created';

export default async function handlePostCommentCreated(event: PostCommentCreatedEvent) {
  const payload = event.payload;

  if (payload.commenterId === payload.postAuthorId) {
    return;
  }

  await createNotification(payload.postAuthorId, 'post-comment-created', {
    postId: payload.postId,
    commentId: payload.commentId,
    commenterId: payload.commenterId,
    commenterAlias: payload.commenterAlias,
    commentType: payload.commentType,
  });
}