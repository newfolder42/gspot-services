import { query } from "./db";

export type NotificationRecord = {
  id: number;
  userId: number;
  userAlias?: string;
  type: string;
  details: any;
  createdAt: Date;
  seen: number | null;
  seenAt: Date | null;
};

export async function markNotificationSeen(notificationId: number, userId: number) {
  try {
    if (!notificationId || !userId) return false;

    const res = await query(
      `UPDATE user_notifications
       SET seen = 1, seen_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );

    return res.rows.length > 0;
  } catch (err) {
    console.error('markNotificationSeen error', err);
    return false;
  }
}

export async function createNotification(
  userId: number,
  type: string,
  details: Record<string, any>
): Promise<number | null> {
  try {
    if (!userId || !type || !details) return null;

    const res = await query(
      `INSERT INTO user_notifications (user_id, type, details)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, type, JSON.stringify(details)]
    );

    return res.rows.length > 0 ? res.rows[0].id : null;
  } catch (err) {
    console.error('createNotification error', err);
    return null;
  }
}
