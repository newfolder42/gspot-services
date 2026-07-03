import { createNotification } from '../../lib/notifications';
import { getZoneActiveUserIds } from '../../lib/zoneMembers';
import { ZoneQuestCreated } from '../../types/zone-quest-created';

export default async function handleZoneQuestCreated(event: ZoneQuestCreated) {
  const payload = event.payload;

  const activeUserIds = (await getZoneActiveUserIds(payload.zoneId));

  const details = {
    questId: payload.questId,
    questTitle: payload.questTitle,
    zoneId: payload.zoneId,
    zoneSlug: payload.zoneSlug,
    character: payload.character,
    requiredLevel: payload.requiredLevel,
    createdBy: payload.createdBy,
    createdByAlias: payload.createdByAlias,
  };

  for (const userId of activeUserIds) {
    await createNotification(userId, 'zone-quest-created', details);
  }
}
