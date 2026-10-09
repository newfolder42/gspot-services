import { createNotification } from '../../lib/notifications';
import { getZoneReviewerUserIds } from '../../lib/zoneMembers';
import { PostLocationCorrectedEvent } from '../../types/post-location-corrected';

/**
 * The author fixed a suspended post and it is live again. The zone's owners/admins hear about
 * it so they can look the new location over — a correction is not re-approved by anyone.
 */
export default async function handlePostLocationCorrected(event: PostLocationCorrectedEvent) {
  const payload = event.payload;

  const reviewerIds = await getZoneReviewerUserIds(payload.zoneId, [payload.authorId]);
  for (const reviewerId of reviewerIds) {
    await createNotification(reviewerId, 'post-location-corrected', {
      postId: payload.postId,
      postTitle: payload.postTitle,
      zoneSlug: payload.zoneSlug,
      authorAlias: payload.authorAlias,
    });
  }
}
