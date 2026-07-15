import { query } from '../../lib/db';
import { applyRewardSpecs, parseRewardSpecs } from '../../lib/rewards';
import { UserAchievementAchievedEvent } from '../../types/user-achievement-achieved';

export default async function handleRewardsForUserAchievementAchieved(event: UserAchievementAchievedEvent) {
  const payload = event.payload;

  try {
    const res = payload.milestoneKey
      ? await query('SELECT rewards FROM achievement_milestones WHERE key = $1 LIMIT 1', [payload.milestoneKey])
      : await query('SELECT rewards FROM achievements WHERE key = $1 LIMIT 1', [payload.achievementKey]);
    if ((res.rowCount ?? 0) === 0) return;

    const source = payload.milestoneKey
      ? `achievement_milestone:${payload.milestoneKey}`
      : `achievement:${payload.achievementKey}`;
    const specs = parseRewardSpecs(res.rows[0].rewards, source);
    if (specs.length === 0) return;

    await applyRewardSpecs(payload.userId, specs, {
      xpAction: 'achievement_achieved',
      details: {
        achievementKey: payload.achievementKey,
        ...(payload.milestoneKey ? { milestoneKey: payload.milestoneKey } : {}),
      },
    });
  } catch (err) {
    console.error('Failed handleRewardsForUserAchievementAchieved', err, event);
  }
}
