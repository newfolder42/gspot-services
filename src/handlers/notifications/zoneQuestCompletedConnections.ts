import { getConnecters } from '../../lib/connectiosn';
import { upsertGroupedNotification } from '../../lib/notifications';
import { ZoneQuestCompletedEvent } from '../../types/zone-quest-completed';

export default async function handleZoneQuestCompletedConnections(event: ZoneQuestCompletedEvent) {
  const payload = event.payload;

  const connections = await getConnecters(payload.userId);

  // A follower of several people who finish the same quest hears about it once.
  for (const connection of connections) {
    await upsertGroupedNotification({
      userId: connection.id,
      type: 'connection-completed-zone-quest',
      groupKey: `quest-completed-by:${payload.questId}`,
      actor: { userId: payload.userId, alias: payload.userAlias },
      details: {
        userId: payload.userId,
        userAlias: payload.userAlias,
        zoneId: payload.zoneId,
        zoneSlug: payload.zoneSlug,
        questId: payload.questId,
        questTitle: payload.questTitle,
        postId: payload.postId,
      },
    });
  }
}
