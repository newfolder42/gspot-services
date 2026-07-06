import { createQuestCompletedEvent } from '../../lib/feedEvents';
import { ZoneQuestCompleted } from '../../types/zone-quest-completed';

export default async function handleQuestCompletedFeedEvent(event: ZoneQuestCompleted) {
  const payload = event.payload;

  await createQuestCompletedEvent({
    questId: payload.questId,
    questTitle: payload.questTitle,
    zoneId: payload.zoneId,
    zoneSlug: payload.zoneSlug,
    userId: payload.userId,
    userAlias: payload.userAlias,
  });
}
