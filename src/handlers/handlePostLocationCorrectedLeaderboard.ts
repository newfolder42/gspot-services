import { query } from '../lib/db';
import { PostLocationCorrectedEvent } from '../types/post-location-corrected';
import { monthKey, weekKey } from './handlePostGuessedLeaderboard';

/**
 * A corrected location re-scores every guess on the post. The guessers' ratings in the zone's
 * `gps-guessers` leaderboard are moved by the difference, in the same total / week / month
 * buckets the guess was originally counted in — the week and month follow when the guess was
 * placed, not when the author got round to correcting.
 *
 * Ratings never go below zero: a row that is somehow short of the points being taken back is
 * floored rather than left negative.
 */
export default async function handlePostLocationCorrectedLeaderboard(event: PostLocationCorrectedEvent) {
  const payload = event.payload;

  for (const guess of payload.guesses) {
    const delta = guess.score - guess.previousScore;
    if (delta === 0) continue;

    try {
      const guessedAt = new Date(guess.guessedAt);

      await query(
        `INSERT INTO leaderboards(type, zone_id, user_id, period_key, rating, last_modified_at)
         VALUES ($1, $2, $3, $4, GREATEST($7, 0), NOW()),
                ($1, $2, $3, $5, GREATEST($7, 0), NOW()),
                ($1, $2, $3, $6, GREATEST($7, 0), NOW())
         ON CONFLICT (type, zone_id, user_id, period_key) DO UPDATE
           SET rating = GREATEST(leaderboards.rating + $7, 0),
               last_modified_at = NOW()`,
        ['gps-guessers', payload.zoneId, guess.userId, 'total', weekKey(guessedAt), monthKey(guessedAt), delta]
      );
    } catch (err) {
      console.error('Failed to re-score leaderboard for corrected post location', err, guess);
    }
  }
}
