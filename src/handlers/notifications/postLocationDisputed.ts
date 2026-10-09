import { createNotification } from '../../lib/notifications';
import { getZoneReviewerUserIds } from '../../lib/zoneMembers';
import { PostLocationDisputedEvent } from '../../types/post-location-disputed';

/**
 * The first open dispute on a post tells the zone's owners/admins that there is something to
 * review, and the author that their post's location was contested. Later disputes only add to
 * the count the reviewer sees on the post, so nobody is notified once per guesser.
 */
export default async function handlePostLocationDisputed(event: PostLocationDisputedEvent) {
  const payload = event.payload;
  if (!payload.firstOpen) return;

  const details = {
    postId: payload.postId,
    postTitle: payload.postTitle,
    zoneSlug: payload.zoneSlug,
  };

  // The author may also be an admin of their own zone; they get the author's message only.
  const reviewerIds = await getZoneReviewerUserIds(payload.zoneId, [payload.authorId, payload.reporterId]);

  for (const reviewerId of reviewerIds) {
    await createNotification(reviewerId, 'post-location-disputed', {
      ...details,
      reporterAlias: payload.reporterAlias,
      disputeCount: payload.openCount,
      reason: payload.reason ?? null,
      note: payload.note ?? null,
    });
  }

  // The author is told why, but not by whom.
  await createNotification(payload.authorId, 'post-location-flagged', {
    ...details,
    reason: payload.reason ?? null,
    note: payload.note ?? null,
  });
}
