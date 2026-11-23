import { upsertGroupedNotification } from '../../lib/notifications';
import { getZoneStaffUserIds } from '../../lib/zoneMembers';
import { ZoneQuestObjectiveSubmittedEvent } from '../../types/zone-quest-objective-submitted';

export default async function handleZoneQuestObjectiveSubmitted(event: ZoneQuestObjectiveSubmittedEvent) {
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

  // Submissions to one quest share a notification (it links to that quest's moderation
  // page). The same person sending in another objective is still news for the reviewer.
  for (const staffUserId of staffUserIds) {
    await upsertGroupedNotification({
      userId: staffUserId,
      type: 'zone-quest-objective-submitted',
      groupKey: `objective-submitted:${payload.questId}`,
      actor: { userId: payload.userId, alias: payload.userAlias },
      details,
      renotifyRepeat: true,
    });
  }
}
