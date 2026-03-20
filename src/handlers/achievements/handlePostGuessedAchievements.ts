import {
  getGuessesTotalCount,
  getLongestActivityStreakDays,
  getPerfectGuessesTotalCount,
  updateProgressiveAchievement,
} from '../../lib/achievements';
import { PostGuessed } from '../../types/post-guesed';

export default async function handlePostGuessedAchievements(event: PostGuessed) {
  const userId = event.payload.userId;

  try {
    const guessesTotal = await getGuessesTotalCount(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'guesses_total',
      currentValue: guessesTotal,
    });

    if (event.payload.score === 100) {
      const perfectGuessesTotal = await getPerfectGuessesTotalCount(userId);
      await updateProgressiveAchievement({
        userId,
        achievementKey: 'perfect_guesses_total',
        currentValue: perfectGuessesTotal,
      });
    }

    const longestStreak = await getLongestActivityStreakDays(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'streak_days',
      currentValue: longestStreak,
    });
  } catch (err) {
    console.error('Failed to process post-guessed achievements', err, event);
  }
}
