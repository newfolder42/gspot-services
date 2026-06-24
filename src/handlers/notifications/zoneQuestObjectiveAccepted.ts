import { createNotification } from '../../lib/notifications';
import { ZoneQuestObjectiveAccepted } from '../../types/zone-quest-objective-accepted';

export default async function handleZoneQuestObjectiveAccepted(event: ZoneQuestObjectiveAccepted) {
  const payload = event.payload;

  await createNotification(payload.userId, 'zone-quest-objective-accepted', {
    zoneSlug: payload.zoneSlug,
    questId: payload.questId,
    objectiveId: payload.objectiveId,
    objectiveTitle: payload.objectiveTitle,
  });
}
