import { query } from './db';
import { updateProgressiveAchievement } from './achievements';

/** Mirrors the web `items` catalog row that the grant returns. */
export type GrantedItem = {
  alias: string;
  name: string;
  quality: string;
  iconUrl: string | null;
  stackable: boolean;
  count: number;
};

export type ItemGrantSource = 'found' | 'quest' | 'achievement' | 'manual';

/**
 * Puts an item in a user's bag, returning it with the resulting count when something
 * actually changed.
 *
 * A stackable item raises the count on the row the user already has — never a second row,
 * so the bag never shows the same item twice — and therefore always returns. A unique item
 * the user already holds updates nothing and returns null. Disabled catalog rows are never
 * granted. Mirrors gspot-web src/lib/inventory.ts#grantItemToUser.
 */
export async function grantItemToUser(
  userId: number,
  alias: string,
  source: ItemGrantSource,
  sourceDetails: Record<string, unknown> = {}
): Promise<GrantedItem | null> {
  const defRes = await query(
    `SELECT id, alias, name, quality, icon_url, stackable
     FROM items WHERE alias = $1 AND status = 'active' LIMIT 1`,
    [alias]
  );
  if ((defRes.rowCount ?? 0) === 0) return null;

  const row = defRes.rows[0];
  const stackable = Boolean(row.stackable);

  const res = await query(
    stackable
      ? `INSERT INTO user_items (user_id, item_id, count, source, source_details)
         VALUES ($1, $2, 1, $3, $4::jsonb)
         ON CONFLICT (user_id, item_id) DO UPDATE SET count = user_items.count + 1
         RETURNING count`
      : `INSERT INTO user_items (user_id, item_id, count, source, source_details)
         VALUES ($1, $2, 1, $3, $4::jsonb)
         ON CONFLICT (user_id, item_id) DO NOTHING
         RETURNING count`,
    [userId, Number(row.id), source, JSON.stringify(sourceDetails)]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  return {
    alias: row.alias,
    name: row.name,
    quality: row.quality,
    iconUrl: row.icon_url ?? null,
    stackable,
    count: Number(res.rows[0].count ?? 1),
  };
}

/**
 * Distinct items held, not the sum of stack counts — items_collected rewards collecting
 * different ნივთები, so holding five of one stackable item is still one item collected.
 */
export async function getUserItemsCount(userId: number): Promise<number> {
  const res = await query(
    `SELECT COUNT(*)::int AS total FROM user_items WHERE user_id = $1`,
    [userId]
  );
  return Number(res.rows[0]?.total || 0);
}

/**
 * Recomputes the items_collected track from the bag, so every grant source — finds,
 * quests, achievements, a manual INSERT — feeds the same milestones.
 */
export async function syncItemsCollectedAchievement(userId: number): Promise<void> {
  const total = await getUserItemsCount(userId);
  await updateProgressiveAchievement({
    userId,
    achievementKey: 'items_collected',
    currentValue: total,
  });
}
