import { query } from './db';
import { withDbRetry } from './achievements';

export async function recordUserActivity(
  userId: number,
  occurredAtIso: string
): Promise<void> {
  await withDbRetry(`recordUserActivity`, async () => {
    await query(
      `INSERT INTO user_streaks (user_id, activity_date)
       SELECT u.id, $2::timestamptz::date
       FROM users u
       WHERE u.id = $1
       ON CONFLICT (user_id, activity_date) DO NOTHING`,
      [userId, occurredAtIso]
    );
  });
}

export async function getLongestStreakDays(userId: number): Promise<number> {
  const res = await query(
    `WITH grouped AS (
       SELECT activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date))::int AS grp
       FROM user_streaks
       WHERE user_id = $1
     )
     SELECT COALESCE(MAX(streak_length), 0)::int AS longest_streak
     FROM (
       SELECT COUNT(*)::int AS streak_length
       FROM grouped
       GROUP BY grp
     ) streaks`,
    [userId]
  );

  return Number(res.rows[0]?.longest_streak || 0);
}
