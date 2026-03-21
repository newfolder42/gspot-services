import { query } from './db';
import { publish } from './redis';

type AchievementType = 'one_time' | 'progressive';
type AchievementStatus = 'locked' | 'in_progress' | 'achieved';

type AchievementDefinition = {
  id: number;
  key: string;
  name: string;
  achievementType: AchievementType;
  milestones: Array<{
    id: number;
    key: string;
    name: string;
    targetValue: number;
  }>;
};

type UserAchievementRow = {
  current_value: number;
  achieved_at: Date | null;
};

const RETRYABLE_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '08000', // connection_exception
  '08006', // connection_failure
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: any): boolean {
  if (!error) return false;
  if (error.code && RETRYABLE_CODES.has(error.code)) return true;

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('connection terminated') ||
    message.includes('connection reset')
  );
}

export async function withDbRetry<T>(opName: string, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const backoffMs = 100 * Math.pow(2, attempt - 1);
      console.warn('Retrying DB operation after error', {
        opName,
        attempt,
        backoffMs,
        errorCode: (error as any)?.code,
        errorMessage: (error as any)?.message,
      });
      await sleep(backoffMs);
    }
  }

  throw new Error(`DB operation failed after retries: ${opName}`);
}

async function userExists(userId: number): Promise<boolean> {
  const res = await query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [userId]);
  return (res.rowCount ?? 0) > 0;
}

async function getAchievementDefinition(key: string): Promise<AchievementDefinition | null> {
  const achievementRes = await query(
    `SELECT id, key, name, achievement_type
     FROM achievements
     WHERE key = $1
     LIMIT 1`,
    [key]
  );

  if ((achievementRes.rowCount ?? 0) === 0) {
    return null;
  }

  const achievementRow = achievementRes.rows[0];
  const milestonesRes = await query(
    `SELECT id, key, name, target_value
     FROM achievement_milestones
     WHERE achievement_id = $1
     ORDER BY target_value ASC, sort_order ASC, id ASC`,
    [achievementRow.id]
  );

  return {
    id: Number(achievementRow.id),
    key: String(achievementRow.key),
    name: String(achievementRow.name),
    achievementType: achievementRow.achievement_type as AchievementType,
    milestones: milestonesRes.rows.map((row) => ({
      id: Number(row.id),
      key: String(row.key),
      name: String(row.name),
      targetValue: Number(row.target_value),
    })),
  };
}

function getProgressiveStatus(currentValue: number, maxTargetValue: number): AchievementStatus {
  if (currentValue >= maxTargetValue) return 'achieved';
  if (currentValue > 0) return 'in_progress';
  return 'locked';
}

async function fetchUserAchievement(userId: number, achievementId: number): Promise<UserAchievementRow | null> {
  const res = await query(
    `SELECT current_value, achieved_at
     FROM user_achievements
     WHERE user_id = $1 AND achievement_id = $2
     LIMIT 1`,
    [userId, achievementId]
  );

  if ((res.rowCount ?? 0) === 0) {
    return null;
  }

  return {
    current_value: Number(res.rows[0].current_value),
    achieved_at: res.rows[0].achieved_at,
  };
}

async function unlockMilestones(
  userId: number,
  definition: AchievementDefinition,
  currentValue: number,
  unlockTime: string
): Promise<void> {
  if (definition.milestones.length === 0) return;

  const insertResult = await query(
    `INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock)
     SELECT $1, m.id, $2::timestamptz, $3
     FROM achievement_milestones m
     WHERE m.achievement_id = $4
       AND $3 >= m.target_value
     ON CONFLICT (user_id, milestone_id) DO NOTHING
     RETURNING milestone_id`,
    [userId, unlockTime, currentValue, definition.id]
  );

  if ((insertResult.rowCount ?? 0) === 0) return;

  const ids = insertResult.rows.map((row) => Number(row.milestone_id));
  const milestoneResult = await query(
    `SELECT key, name
     FROM achievement_milestones
     WHERE id = ANY($1::bigint[])`,
    [ids]
  );

  for (const row of milestoneResult.rows) {
    console.log('Achievement milestone unlocked', {
      userId,
      achievementKey: definition.key,
      milestoneKey: row.key,
      currentValue,
    });

    await publish('user_achievement', 'achieved', {
      userId,
      achievementKey: definition.key,
      achievementName: definition.name,
      achievementType: definition.achievementType,
      milestoneKey: row.key,
      milestoneName: row.name,
      currentValue,
      achievedAt: unlockTime,
    });
  }
}

export async function awardOneTimeAchievement(
  userId: number,
  achievementKey: string,
  achievedAtIso: string
): Promise<void> {
  await withDbRetry(`awardOneTimeAchievement:${achievementKey}`, async () => {
    if (!(await userExists(userId))) {
      return;
    }

    const definition = await getAchievementDefinition(achievementKey);
    if (!definition) {
      return;
    }

    if (definition.achievementType !== 'one_time') {
      console.warn('Achievement type mismatch for one-time award', {
        achievementKey,
        actualType: definition.achievementType,
      });
      return;
    }

    const existing = await fetchUserAchievement(userId, definition.id);
    if (existing?.achieved_at) {
      return;
    }

    await query(
      `INSERT INTO user_achievements (
        user_id,
        achievement_id,
        current_value,
        status,
        achieved_at,
        last_modified_at
      ) VALUES ($1, $2, 1, 'achieved', $3::timestamptz, NOW())
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET current_value = 1,
          status = 'achieved',
          achieved_at = COALESCE(user_achievements.achieved_at, EXCLUDED.achieved_at),
          last_modified_at = NOW()`,
      [userId, definition.id, achievedAtIso]
    );

    console.log('Achievement unlocked', {
      userId,
      achievementKey,
      achievedAt: achievedAtIso,
    });

    await publish('user_achievement', 'achieved', {
      userId,
      achievementKey,
      achievementName: definition.name,
      achievementType: definition.achievementType,
      achievedAt: achievedAtIso,
    });
  });
}

type UpdateProgressiveInput = {
  userId: number;
  achievementKey: string;
  currentValue: number;
  achievedAtIso?: string;
  enforceMonotonicIncrease?: boolean;
};

export async function updateProgressiveAchievement(input: UpdateProgressiveInput): Promise<void> {
  const {
    userId,
    achievementKey,
    currentValue,
    achievedAtIso,
    enforceMonotonicIncrease = false,
  } = input;

  await withDbRetry(`updateProgressiveAchievement:${achievementKey}`, async () => {
    if (!(await userExists(userId))) {
      console.warn('Skipping progressive achievement for missing user', { userId, achievementKey });
      return;
    }

    const definition = await getAchievementDefinition(achievementKey);
    if (!definition) {
      console.warn('Achievement key not found', { achievementKey });
      return;
    }

    if (definition.achievementType !== 'progressive') {
      console.warn('Achievement type mismatch for progressive update', {
        achievementKey,
        actualType: definition.achievementType,
      });
      return;
    }

    if (definition.milestones.length === 0) {
      console.warn('Progressive achievement has no milestones', { achievementKey });
      return;
    }

    const maxMilestoneTarget = definition.milestones[definition.milestones.length - 1].targetValue;
    const previous = await fetchUserAchievement(userId, definition.id);

    let nextValue = Math.max(0, currentValue);
    if (enforceMonotonicIncrease && previous) {
      nextValue = Math.max(nextValue, previous.current_value);
    }

    const nextStatus = getProgressiveStatus(nextValue, maxMilestoneTarget);
    const nowIso = new Date().toISOString();

    const nextAchievedAt =
      previous?.achieved_at ||
      (nextStatus === 'achieved' ? (achievedAtIso || nowIso) : null);

    await query(
      `INSERT INTO user_achievements (
        user_id,
        achievement_id,
        current_value,
        status,
        achieved_at,
        last_modified_at
      ) VALUES ($1, $2, $3, $4, $5::timestamptz, NOW())
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET current_value = EXCLUDED.current_value,
          status = EXCLUDED.status,
          achieved_at = COALESCE(user_achievements.achieved_at, EXCLUDED.achieved_at),
          last_modified_at = NOW()`,
      [userId, definition.id, nextValue, nextStatus, nextAchievedAt]
    );

    await unlockMilestones(userId, definition, nextValue, achievedAtIso || nowIso);

    if (nextStatus === 'achieved' && !previous?.achieved_at) {
      console.log('Achievement fully achieved', {
        userId,
        achievementKey,
        currentValue: nextValue,
        achievedAt: nextAchievedAt,
      });

      await publish('user_achievement', 'achieved', {
        userId,
        achievementKey,
        achievementName: definition.name,
        achievementType: definition.achievementType,
        currentValue: nextValue,
        achievedAt: nextAchievedAt,
      });
    }
  });
}

export async function getPublishedPostsCount(userId: number): Promise<number> {
  const res = await query(
    `SELECT COUNT(*)::int AS total
     FROM posts
     WHERE user_id = $1 AND status = 'published'`,
    [userId]
  );

  return Number(res.rows[0]?.total || 0);
}

export async function getGuessesTotalCount(userId: number): Promise<number> {
  const res = await query(
    `SELECT COUNT(*)::int AS total
     FROM post_guesses
     WHERE user_id = $1`,
    [userId]
  );

  return Number(res.rows[0]?.total || 0);
}

export async function getPerfectGuessesTotalCount(userId: number): Promise<number> {
  const res = await query(
    `SELECT COUNT(*)::int AS total
     FROM post_guesses
     WHERE user_id = $1
       AND COALESCE((details->>'score')::int, 0) = 100`,
    [userId]
  );

  return Number(res.rows[0]?.total || 0);
}

export async function getLongestActivityStreakDays(userId: number): Promise<number> {
  const res = await query(
    `WITH activity_days AS (
  SELECT p.created_at::date AS day
  FROM posts p
  WHERE p.user_id = $1
    AND p.status = 'published'

  UNION

  SELECT pg.created_at::date AS day
  FROM post_guesses pg
  WHERE pg.user_id = $1
),
grouped AS (
  SELECT
    day,
    day - (ROW_NUMBER() OVER (ORDER BY day))::int AS grp
  FROM activity_days
),
streaks AS (
  SELECT COUNT(*)::int AS streak_length
  FROM grouped
  GROUP BY grp
)
SELECT COALESCE(MAX(streak_length), 0)::int AS longest_streak
FROM streaks`,
    [userId]
  );

  return Number(res.rows[0]?.longest_streak || 0);
}
