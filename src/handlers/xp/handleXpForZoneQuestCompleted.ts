import { increaseUserXp } from "../../lib/xp";
import { ZoneQuestCompleted } from "../../types/zone-quest-completed";

export default async function handleXpForZoneQuestCompleted(event: ZoneQuestCompleted) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: payload.userId,
      action: 'zone_quest_completed',
      details: { questId: payload.questId, zoneId: payload.zoneId },
    });
  } catch (err) {
    console.error('Failed handleXpForZoneQuestCompleted', err, event);
  }
}
