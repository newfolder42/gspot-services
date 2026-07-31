import {
  getGuessesTotalCount,
  getPerfectGuessesTotalCount,
  updateProgressiveAchievement,
} from '../../lib/achievements';
import { PostGuessedEvent } from '../../types/post-guessed';

export default async function handlePostGuessedAchievements(event: PostGuessedEvent) {
  const userId = event.payload.userId;

  try {
    const guessesTotal = await getGuessesTotalCount(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'guesses_total',
      currentValue: guessesTotal,
    });

    if (event.payload.score >= 100) {
      const perfectGuessesTotal = await getPerfectGuessesTotalCount(userId);
      await updateProgressiveAchievement({
        userId,
        achievementKey: 'perfect_guesses_total',
        currentValue: perfectGuessesTotal,
      });
    }
  } catch (err) {
    console.error('Failed to process post-guessed achievements', err, event);
  }
}
