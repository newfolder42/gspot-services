import { createNotification } from '../../lib/notifications';
import { PostCommentCreatedEvent } from '../../types/post-comment-created';

export default async function handlePostCommentCreated(event: PostCommentCreatedEvent) {
  const payload = event.payload;

  const notification = {
    postId: payload.postId,
    commentId: payload.commentId,
    parent: payload.parent,
    commenterId: payload.commenterId,
    commenterAlias: payload.commenterAlias,
    commentType: payload.commentType,
  };

  if (!payload.parent) {
    if (payload.commenterId !== payload.postAuthorId) {
      await createNotification(payload.postAuthorId, 'post-comment-created', notification);
    }
  } else {
    if (payload.parent.commenterId !== payload.commenterId) {
      await createNotification(payload.parent.commenterId, 'post-comment-created', notification);
    }
  }
}