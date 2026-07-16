import {
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
  } catch (err) {
    console.error('Failed to process post-published achievements', err, event);
  }
}
