import { query } from '../../lib/db';
import { applyRewardSpecs, parseRewardSpecs } from '../../lib/rewards';
import { ZoneQuestCompleted } from '../../types/zone-quest-completed';

export default async function handleRewardsForZoneQuestCompleted(event: ZoneQuestCompleted) {
  const payload = event.payload;

  try {
    const res = await query(
      'SELECT rewards FROM zone_quests WHERE id = $1 LIMIT 1',
      [payload.questId]
    );
    if ((res.rowCount ?? 0) === 0) {
      return;
    }

    const specs = parseRewardSpecs(res.rows[0].rewards, `zone_quest:${payload.questId}`);
    if (specs.length === 0) {
      return;
    }

    await applyRewardSpecs(payload.userId, specs, {
      xpAction: 'zone_quest_completed',
      details: { questId: payload.questId, zoneId: payload.zoneId },
    });
  } catch (err) {
    console.error('Failed handleRewardsForZoneQuestCompleted', err, event);
  }
}
