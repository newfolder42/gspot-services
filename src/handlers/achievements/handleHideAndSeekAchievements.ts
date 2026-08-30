import { getHideAndSeekCompletedCount, updateProgressiveAchievement } from '../../lib/achievements';
import { HideAndSeekFoundEvent } from '../../types/hide-and-seek';

/**
 * A "completed" game counts for both sides of a successful hunt: the seeker who found
 * the host, and the host who was found.
 */
export default async function handleHideAndSeekAchievements(event: HideAndSeekFoundEvent) {
  const { userId, hostId } = event.payload;

  for (const id of [userId, hostId]) {
    try {
      const total = await getHideAndSeekCompletedCount(id);
      await updateProgressiveAchievement({
        userId: id,
        achievementKey: 'hide_and_seek_completed',
        currentValue: total,
      });
    } catch (err) {
      console.error('Failed to process hide-and-seek achievements', err, event);
    }
  }
}
