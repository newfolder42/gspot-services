import { createNotification } from '../../lib/notifications';
import { HideAndSeekCheckedEvent } from '../../types/hide-and-seek';

/**
 * A busy game produces dozens of checks. The host is pinged only when a seeker beats
 * their own closest distance, which is the part that is actually worth knowing; the
 * catch itself arrives separately as a 'found' notification.
 */
export default async function handleHideAndSeekChecked(event: HideAndSeekCheckedEvent) {
  const payload = event.payload;

  if (!payload.isNewBest || payload.found) return;

  await createNotification(payload.hostId, 'hide-and-seek-checked', {
    gameId: payload.gameId,
    postId: payload.postId,
    title: '',
    hostId: payload.hostId,
    hostAlias: payload.hostAlias,
    role: 'host',
    userId: payload.userId,
    userAlias: payload.userAlias,
    distanceMeters: payload.distanceMeters,
  });
}
