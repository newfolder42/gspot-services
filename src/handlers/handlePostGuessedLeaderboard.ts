import { query } from '../lib/db';
import { PostGuessed } from '../types/post-guesed';

export default async function handlePostGuessedLeaderboard(event: PostGuessed) {
  const payload = event.payload;

  const leaderboardType = 'gps-guessers';
  const userId = payload.userId;
  const ratingDelta = payload.score;

  try {
    await query(
      `WITH upsert AS (
         INSERT INTO leaderboards(type, user_id, rating, created_at, last_modified_at)
         VALUES ($1, $2, $3, current_timestamp, current_timestamp)
         ON CONFLICT (type, user_id) DO UPDATE
           SET rating = leaderboards.rating + EXCLUDED.rating,
               last_modified_at = current_timestamp
         RETURNING id
       )
       INSERT INTO leaderboard_events(leaderboard_id, user_id, type, rating_delta, details, occurred_at, created_at)
       SELECT id, $2, 'post-guesed', $3, $4::jsonb, current_timestamp, current_timestamp FROM upsert
      `,
      [leaderboardType, userId, ratingDelta, JSON.stringify(event)]
    );
  } catch (err) {
    console.error('Failed to update leaderboard for post published', err);
  }
}
