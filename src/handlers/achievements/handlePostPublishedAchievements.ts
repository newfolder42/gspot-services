import {
  getLongestActivityStreakDays,
  getPublishedPostsCount,
  updateProgressiveAchievement,
} from '../../lib/achievements';
import { PostPublished } from '../../types/post-published';

export default async function handlePostPublishedAchievements(event: PostPublished) {
  const userId = event.payload.authorId;

  try {
    const postsTotal = await getPublishedPostsCount(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'posts_total',
      currentValue: postsTotal,
    });

    const longestStreak = await getLongestActivityStreakDays(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'streak_days',
      currentValue: longestStreak,
    });
  } catch (err) {
    console.error('Failed to process post-published achievements', err, event);
  }
}
