import { createNotification } from '../../lib/notifications';
import { HideAndSeekJoinedEvent } from '../../types/hide-and-seek';

export default async function handleHideAndSeekJoined(event: HideAndSeekJoinedEvent) {
  const payload = event.payload;

  await createNotification(payload.hostId, 'hide-and-seek-joined', {
    gameId: payload.gameId,
    postId: payload.postId,
    title: '',
    hostId: payload.hostId,
    hostAlias: payload.hostAlias,
    role: 'host',
    userId: payload.userId,
    userAlias: payload.userAlias,
  });
}
