import { query } from './db';
import { publish } from './redis';

export const maxLevel = 42;

let cachedXpTable: number[] | null = null;

export async function fetchXpTable(): Promise<number[]> {
  const result = await query(
    'SELECT level, xp FROM xp_levels ORDER BY level ASC'
  );
  
  return result.rows.map(row => row.xp);
}

export async function getXpTable(): Promise<number[]> {
  if (!cachedXpTable) {
    cachedXpTable = await fetchXpTable();
  }
  return cachedXpTable;
}

export const xpActionDictionary: Record<string, number> = {
  'post-guessed': 50, // User guessed a post
  'post-being-guessed': 10, // User's post was guessed by someone else
  'post-published': 100, // User published a post
  'post-deleted': -100, // User deleted a post
};

export type XPInfo = {
  level: number;          // Current level (1-based)
  currentXP: number;      // XP progress within current level
  xpForNextLevel: number; // XP needed to complete current level and reach next
  totalXP: number;        // Total accumulated XP
  levelStartXP: number;   // XP threshold for current level
  levelEndXP: number;     // XP threshold for next level
};

export async function getLevelFromXp(totalXP: number): Promise<XPInfo> {
  const xpTable = await getXpTable();

  if (totalXP < 0) {
    return {
      level: 1,
      currentXP: 0,
      xpForNextLevel: xpTable[1],
      totalXP: 0,
      levelStartXP: 0,
      levelEndXP: xpTable[1],
    };
  }

  let level = 1;
  for (let i = xpTable.length - 1; i >= 0; i--) {
    if (totalXP >= xpTable[i]) {
      level = i + 1;
      break;
    }
  }

  const levelStartXP = xpTable[level - 1];
  const levelEndXP = level < xpTable.length ? xpTable[level] : levelStartXP + 1000; // If max level, add arbitrary amount
  const currentXP = totalXP - levelStartXP;
  const xpForNextLevel = levelEndXP - levelStartXP;

  return {
    level,
    currentXP,
    xpForNextLevel,
    totalXP,
    levelStartXP,
    levelEndXP,
  };
}

export type IncreaseUserXpInput = {
  userId: number;
  action: string;
  details?: Record<string, any>;
};

export async function increaseUserXp(
  input: IncreaseUserXpInput
): Promise<XPInfo> {
  const { userId, action, details } = input;

  const xp = xpActionDictionary[action];
  if (xp === undefined) {
    throw new Error(`Unknown XP action: ${action}`);
  }

  try {
    const currentLevelResult = await query(
      `SELECT xp, level FROM user_xp WHERE user_id = $1`,
      [userId]
    );
    const currentTotalXP = currentLevelResult.rows[0]?.xp || 0;
    const currentLevel = currentLevelResult.rows[0]?.level || 1;

    if (currentLevel >= maxLevel) {
      return await getLevelFromXp(currentTotalXP);
    }

    await query('BEGIN');
    
    await query(
      `INSERT INTO user_xp_events (user_id, action, xp, details) 
         VALUES ($1, $2, $3, $4)`,
      [userId, action, xp, details ? JSON.stringify(details) : null]
    );

    const currentResult = await query(
      `INSERT INTO user_xp (user_id, xp, level)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id) DO UPDATE
         SET xp = user_xp.xp + $2,
             last_modified_at = current_timestamp
         RETURNING xp`,
      [userId, xp]
    );

    const newTotalXP = currentResult.rows[0].xp;
    const xpInfo = await getLevelFromXp(newTotalXP);

    await query(
      `UPDATE user_xp 
         SET level = $1, last_modified_at = current_timestamp
         WHERE user_id = $2`,
      [xpInfo.level, userId]
    );

    await query('COMMIT');

    if (xpInfo.level === currentLevel)
      return xpInfo;

    if (xpInfo.level > currentLevel) {
      await publish('user', 'level-up', {
        userId: userId.toString(),
        previousLevel: currentLevel,
        newLevel: xpInfo.level,
        totalXP: newTotalXP,
        action,
      });
    }

    if (xpInfo.level < currentLevel) {
      await publish('user', 'level-down', {
        userId: userId.toString(),
        previousLevel: currentLevel,
        newLevel: xpInfo.level,
        totalXP: newTotalXP,
        action,
      });
    }

    return xpInfo;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}