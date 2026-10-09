import { createNotification } from '../../lib/notifications';
import { PostDiscardedEvent } from '../../types/post-discarded';

/** Staff closed a suspended post for good: its author is told it will not come back. */
export default async function handlePostDiscarded(event: PostDiscardedEvent) {
  const payload = event.payload;

  await createNotification(payload.authorId, 'post-discarded', {
    postId: payload.postId,
    postTitle: payload.postTitle,
    zoneSlug: payload.zoneSlug,
    actorAlias: payload.actorAlias,
  });
}
