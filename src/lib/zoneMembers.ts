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
