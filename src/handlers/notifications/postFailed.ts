import { PostFailed } from '../../types/post-failed';
import { createNotification } from '../../lib/notifications';

export default async function handlePostFailed(event: PostFailed) {
  const payload = event.payload;

  await createNotification(payload.authorId, 'gps-post-failed', {
    postId: payload.postId,
    authorId: payload.authorId,
    authorAlias: payload.authorAlias,
    postType: payload.postType || null,
    title: payload.postTitle || null,
    reason: payload.reason,
  });
}
