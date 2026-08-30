import { createNotification } from '../../lib/notifications';
import { HideAndSeekFoundEvent } from '../../types/hide-and-seek';

export default async function handleHideAndSeekFound(event: HideAndSeekFoundEvent) {
  const payload = event.payload;

  const base = {
    gameId: payload.gameId,
    postId: payload.postId,
    title: '',
    hostId: payload.hostId,
    hostAlias: payload.hostAlias,
    userId: payload.userId,
    userAlias: payload.userAlias,
    distanceMeters: payload.distanceMeters,
  };

  // both sides get told, worded from their own side of the game
  await createNotification(payload.hostId, 'hide-and-seek-found', { ...base, role: 'host' });
  await createNotification(payload.userId, 'hide-and-seek-found', { ...base, role: 'seeker' });
}
