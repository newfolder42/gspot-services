import { createNotification } from '../../lib/notifications';
import { getZoneReviewerUserIds } from '../../lib/zoneMembers';
import { PostSuspendedEvent } from '../../types/post-suspended';

/**
 * A suspended post tells its author the location has to be corrected, and tells the rest of
 * the zone's owners/admins that a colleague has already acted on it.
 */
export default async function handlePostSuspended(event: PostSuspendedEvent) {
  const payload = event.payload;

  const details = {
    postId: payload.postId,
    postTitle: payload.postTitle,
    zoneSlug: payload.zoneSlug,
    actorAlias: payload.actorAlias,
  };

  // Only the author is shown the admin's note; it is addressed to them.
  await createNotification(payload.authorId, 'post-location-correction-needed', {
    ...details,
    note: payload.note ?? null,
  });

  const reviewerIds = await getZoneReviewerUserIds(payload.zoneId, [payload.actorId, payload.authorId]);
  for (const reviewerId of reviewerIds) {
    await createNotification(reviewerId, 'post-suspended', details);
  }
}
