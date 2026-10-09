import { query } from './db';

export async function getZoneStaffUserIds(zoneId: number, excludeUserId?: number): Promise<number[]> {
  const result = await query(
    `SELECT user_id FROM zone_members
     WHERE zone_id = $1 AND role IN ('owner', 'admin', 'moderator') AND status = 'active'`,
    [zoneId]
  );

  return result.rows
    .map((row) => row.user_id as number)
    .filter((userId) => userId !== excludeUserId);
}

export async function getZoneActiveUserIds(zoneId: number): Promise<number[]> {
  const result = await query(
    `SELECT user_id FROM zone_members
     WHERE zone_id = $1 AND role IN ('member') AND status = 'active'`,
    [zoneId]
  );

  return result.rows
    .map((row) => row.user_id as number);
}

/**
 * Owners and admins of a zone — the people who review a post whose location is disputed.
 * Moderators are left out. `exclude` takes the ids that should not be told (the actor, the
 * post's author), compared as numbers because the driver returns bigint as text.
 */
export async function getZoneReviewerUserIds(zoneId: number, exclude: number[] = []): Promise<number[]> {
  const result = await query(
    `SELECT user_id FROM zone_members
     WHERE zone_id = $1 AND role IN ('owner', 'admin') AND status = 'active'`,
    [zoneId]
  );

  return result.rows
    .map((row) => Number(row.user_id))
    .filter((userId) => !exclude.includes(userId));
}
