import { createNotification } from '../../lib/notifications';
import { ZoneQuestCompleted } from '../../types/zone-quest-completed';

export default async function handleZoneQuestCompleted(event: ZoneQuestCompleted) {
  const payload = event.payload;

  await createNotification(payload.userId, 'zone-quest-completed', {
    zoneSlug: payload.zoneSlug,
    questId: payload.questId,
    questTitle: payload.questTitle,
  });
}
