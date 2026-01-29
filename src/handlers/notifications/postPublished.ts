import { PostPublished } from '../../types/post-published';
import { getConnecters } from '../../lib/connectiosn';
import { createNotification } from '../../lib/notifications';

export default async function handlePostPublished(event: PostPublished) {
  const payload = event.payload;

  const connections = await getConnecters(payload.authorId);
  for (const connection of connections) {
    await createNotification(connection.id, 'connection-created-gps-post', {
      postId: payload.postId,
      authorId: payload.authorId,
      authorAlias: payload.authorAlias,
      postType: payload.postType || null,
      title: payload.postTitle || null,
    });
  }
}
