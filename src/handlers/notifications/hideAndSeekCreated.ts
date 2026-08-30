import { createNotification } from '../../lib/notifications';
import { getZoneActiveUserIds } from '../../lib/zoneMembers';
import { HideAndSeekCreatedEvent } from '../../types/hide-and-seek';

/**
 * A public game is announced to the zone; a private one only to its invitees.
 * Nothing is written to feed_events — games live in the feed as posts only.
 */
export default async function handleHideAndSeekCreated(event: HideAndSeekCreatedEvent) {
  const payload = event.payload;

  const details = {
    gameId: payload.gameId,
    postId: payload.postId,
    title: payload.title,
    hostId: payload.hostId,
    hostAlias: payload.hostAlias,
    role: 'seeker' as const,
  };

  const recipients = payload.visibility === 'private'
    ? payload.inviteeIds
    : (await getZoneActiveUserIds(payload.zoneId)).filter((id) => id !== payload.hostId);

  for (const userId of recipients) {
    await createNotification(userId, 'hide-and-seek-created', details);
  }
}
