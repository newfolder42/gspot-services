import {
  awardOneTimeAchievement,
  getPerfectGuessesTotalCount,
  updateProgressiveAchievement,
} from '../../lib/achievements';
import { PostLocationCorrectedEvent } from '../../types/post-location-corrected';

/**
 * Re-scoring can lift a guess to a perfect 100 (or onto the lucky 42). Achievements only ever
 * move forward here: a guess that stops being perfect does not take a milestone back, because
 * the player did earn it against the location as it was published.
 */
export default async function handlePostLocationCorrectedAchievements(event: PostLocationCorrectedEvent) {
  const perfectGainers = new Set<number>();

  for (const guess of event.payload.guesses) {
    try {
      if (guess.score >= 100 && guess.previousScore < 100) {
        perfectGainers.add(guess.userId);
      }

      if (guess.score === 42 && guess.previousScore !== 42) {
        await awardOneTimeAchievement(guess.userId, 'guess_score_42', event.createdAt);
      }
    } catch (err) {
      console.error('Failed to process corrected-location achievements', err, guess);
    }
  }

  for (const userId of perfectGainers) {
    try {
      const perfectGuessesTotal = await getPerfectGuessesTotalCount(userId);
      await updateProgressiveAchievement({
        userId,
        achievementKey: 'perfect_guesses_total',
        currentValue: perfectGuessesTotal,
        enforceMonotonicIncrease: true,
      });
    } catch (err) {
      console.error('Failed to update perfect_guesses_total after location correction', err, userId);
    }
  }
}
