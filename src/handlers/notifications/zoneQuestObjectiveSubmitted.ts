import { createNotification } from '../../lib/notifications';
import { getZoneStaffUserIds } from '../../lib/zoneMembers';
import { ZoneQuestObjectiveSubmitted } from '../../types/zone-quest-objective-submitted';

export default async function handleZoneQuestObjectiveSubmitted(event: ZoneQuestObjectiveSubmitted) {
  const payload = event.payload;

  const staffUserIds = await getZoneStaffUserIds(payload.zoneId, payload.userId);

  const details = {
    zoneSlug: payload.zoneSlug,
    questId: payload.questId,
    questTitle: payload.questTitle,
    objectiveId: payload.objectiveId,
    objectiveTitle: payload.objectiveTitle,
    submitterAlias: payload.userAlias,
  };

  for (const staffUserId of staffUserIds) {
    await createNotification(staffUserId, 'zone-quest-objective-submitted', details);
  }
}
