import { updateProgressiveAchievement } from '../../lib/achievements';
import { getLongestStreakDays, recordUserActivity } from '../../lib/streaks';

type StreakEvent = { createdAt: string };

export default function handleUserActivityStreak<TEvent extends StreakEvent>(
  getUserId: (event: TEvent) => number | null
) {
  return async (event: TEvent) => {
    try {
      const userId = getUserId(event);
      if (!userId) return;

      await recordUserActivity(userId, event.createdAt);

      const longestStreak = await getLongestStreakDays(userId);
      await updateProgressiveAchievement({
        userId,
        achievementKey: 'streak_days',
        currentValue: longestStreak,
      });
    } catch (err) {
      console.error('Failed to process user activity streak', err, event);
    }
  };
}
