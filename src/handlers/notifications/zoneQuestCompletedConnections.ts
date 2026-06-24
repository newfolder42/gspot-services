import { getConnecters } from '../../lib/connectiosn';
import { createNotification } from '../../lib/notifications';
import { ZoneQuestCompleted } from '../../types/zone-quest-completed';

export default async function handleZoneQuestCompletedConnections(event: ZoneQuestCompleted) {
  const payload = event.payload;

  const connections = await getConnecters(payload.userId);

  for (const connection of connections) {
    await createNotification(connection.id, 'connection-completed-zone-quest', {
      userId: payload.userId,
      userAlias: payload.userAlias,
      zoneId: payload.zoneId,
      zoneSlug: payload.zoneSlug,
      questId: payload.questId,
      questTitle: payload.questTitle,
    });
  }
}
