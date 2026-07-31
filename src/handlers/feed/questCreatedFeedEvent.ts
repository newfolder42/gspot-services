import { createQuestCreatedEvent } from '../../lib/feedEvents';
import { ZoneQuestCreatedEvent } from '../../types/zone-quest-created';

export default async function handleQuestCreatedFeedEvent(event: ZoneQuestCreatedEvent) {
  const payload = event.payload;

  await createQuestCreatedEvent({
    questId: payload.questId,
    questTitle: payload.questTitle,
    zoneId: payload.zoneId,
    zoneSlug: payload.zoneSlug,
    characterName: payload.character?.name ?? null,
    characterAvatar: payload.character?.avatarUrl ?? null,
    createdBy: payload.createdBy,
    createdByAlias: payload.createdByAlias,
  });
}
