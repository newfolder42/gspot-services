import { createNotification } from '../../lib/notifications';
import { ZoneQuestObjectiveRejected } from '../../types/zone-quest-objective-rejected';

export default async function handleZoneQuestObjectiveRejected(event: ZoneQuestObjectiveRejected) {
  const payload = event.payload;

  await createNotification(payload.userId, 'zone-quest-objective-rejected', {
    zoneSlug: payload.zoneSlug,
    questId: payload.questId,
    objectiveId: payload.objectiveId,
    objectiveTitle: payload.objectiveTitle,
    rejectionReason: payload.rejectionReason,
  });
}
