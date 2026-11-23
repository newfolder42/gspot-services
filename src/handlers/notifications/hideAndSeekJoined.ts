import { upsertGroupedNotification } from '../../lib/notifications';
import { HideAndSeekJoinedEvent } from '../../types/hide-and-seek';

export default async function handleHideAndSeekJoined(event: HideAndSeekJoinedEvent) {
  const payload = event.payload;

  // everyone who joins one game is one notification for its host
  await upsertGroupedNotification({
    userId: payload.hostId,
    type: 'hide-and-seek-joined',
    groupKey: `hide-and-seek-joined:${payload.gameId}`,
    actor: { userId: payload.userId, alias: payload.userAlias },
    details: {
      gameId: payload.gameId,
      postId: payload.postId,
      title: '',
      hostId: payload.hostId,
      hostAlias: payload.hostAlias,
      role: 'host',
      userId: payload.userId,
      userAlias: payload.userAlias,
    },
  });
}
