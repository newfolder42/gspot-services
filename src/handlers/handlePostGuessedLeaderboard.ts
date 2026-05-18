import { query } from '../lib/db';
import { PostGuessed } from '../types/post-guesed';

function weekKey(timestamp: Date): string {
  const date = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()));
  const day = date.getUTCDay() || 7; // Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day); // shift to nearest Thursday
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

function monthKey(timestamp: Date): string {
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-M${month}`;
}

export default async function handlePostGuessedLeaderboard(event: PostGuessed) {
  const payload = event.payload;

  const leaderboardType = 'gps-guessers';
  const userId = payload.userId;
  const zoneId = payload.zoneId;
  const ratingDelta = payload.score;
  const eventTimestamp = new Date(event.createdAt);

  try {
    await query(
      `INSERT INTO leaderboards(type, zone_id, user_id, period_key, rating, last_modified_at)
       VALUES ($1, $2, $3, $4, $5, NOW()),
              ($1, $2, $3, $6, $5, NOW()),
              ($1, $2, $3, $7, $5, NOW())
       ON CONFLICT (type, zone_id, user_id, period_key) DO UPDATE
         SET rating = leaderboards.rating + EXCLUDED.rating,
             last_modified_at = NOW()`,
      [leaderboardType, zoneId, userId, 'total', ratingDelta, weekKey(eventTimestamp), monthKey(eventTimestamp)]
    );
  } catch (err) {
    console.error('Failed to update leaderboard for post guessed', err);
  }
}
