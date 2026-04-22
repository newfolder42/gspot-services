import { createNotification } from '../../lib/notifications';
import { PostCommentCreatedEvent } from '../../types/post-comment-created';

export default async function handlePostCommentCreated(event: PostCommentCreatedEvent) {
  const payload = event.payload;

  if (payload.commenterId === payload.postAuthorId) {
    return;
  }

  const notification = {
    postId: payload.postId,
    commentId: payload.commentId,
    parent: payload.parent,
    commenterId: payload.commenterId,
    commenterAlias: payload.commenterAlias,
    commentType: payload.commentType,
  };

  await createNotification(payload.postAuthorId, 'post-comment-created', notification);

  if (payload.parent) {
    if (payload.parent.commenterId === payload.postAuthorId || payload.parent.commenterId === payload.commenterId) {
      return;
    }

    await createNotification(payload.parent.commenterId, 'post-comment-created', notification);
  }
}