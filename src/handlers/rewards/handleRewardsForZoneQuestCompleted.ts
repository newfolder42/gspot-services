import { query } from '../../lib/db';
import { applyRewardSpecs, parseRewardSpecs } from '../../lib/rewards';
import { ZoneQuestCompletedEvent } from '../../types/zone-quest-completed';

export default async function handleRewardsForZoneQuestCompleted(event: ZoneQuestCompletedEvent) {
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

    const granted = await applyRewardSpecs(payload.userId, specs, {
      xpAction: 'zone_quest_completed',
      itemSource: 'quest',
      details: { questId: payload.questId, zoneId: payload.zoneId },
    });

    // What the run actually granted goes on its completion post, for the overlay over the
    // post's first photo. Own try/catch: the items are already in the bag, so a failure here
    // costs the post its overlay and nothing else.
    if (payload.postId && granted.length > 0) {
      try {
        await query(
          `INSERT INTO post_items (post_id, item_id, sort)
           SELECT $1, i.id, (t.ord - 1)::smallint
             FROM unnest($2::varchar[]) WITH ORDINALITY AS t(alias, ord)
             JOIN items i ON i.alias = t.alias
           ON CONFLICT (post_id, item_id) DO NOTHING`,
          [payload.postId, [...new Set(granted.map((item) => item.alias))]]
        );
      } catch (err) {
        console.error('Failed attaching quest items to post', err, event);
      }
    }
  } catch (err) {
    console.error('Failed handleRewardsForZoneQuestCompleted', err, event);
  }
}
