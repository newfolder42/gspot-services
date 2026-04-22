import { query } from '../lib/db';
import { sendUnseenNotification } from '../lib/email';

function normalizeDetails(value: unknown): Record<string, any> {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, any>;
  }
  return {};
}

function buildNotificationText(type: string, details: Record<string, any>): string {
  switch (type) {
    case 'gps-guess':
      return `${details.userAlias}-მა შენს პოსტზე სცადა გამოცნობა (${details.score} ქულა)`;
    
    case 'connection-created-gps-post':
      return details.title?.trim()
        ? `${details.authorAlias}-მა გამოაქვეყნა: ${details.title}`
        : `${details.authorAlias}-მა გამოაქვეყნა ახალი პოსტი`;
    
    case 'user-started-following':
      return `ახალი ფოლოვერი ${details.followerAlias}`;

    case 'user-achievement-achieved':
      if (details.achievementType === 'progressive') {
        return `ახალი მიღწევა: ${details.milestoneName ?? 'მაილსტოუნი'}`;
      }
      if (details.achievementType === 'one_time') {
        return `ახალი მიღწევა: ${details.achievementName ?? 'მიღწევა'}`;
      }
      return 'ახალი მიღწევა';

    case 'post-comment-created':
      return details.commentType === 'comment'
        ? `${details.commenterAlias}-მა დაგიტოვა კომენტარი პოსტზე`
        : `${details.commenterAlias}-მა დაგიტოვა კომენტარი`;
    
    default:
      return `წაუკითხავი ნოტიფიკაცია`;
  }
}

export async function runEmailSenderForUnseenNotifications() {
  console.log("Cron job started at", new Date().toISOString());

  try {
    const result = await query(`
      SELECT 
        un.id,
        un.user_id,
        un.type,
        un.details,
        un.created_at,
        u.email,
        u.name
      FROM user_notifications un
      JOIN users u ON un.user_id = u.id
      JOIN user_options uo ON u.id = uo.user_id
      WHERE (un.seen = 0 OR un.seen IS NULL)
        AND un.created_at < NOW() - INTERVAL '12 hours'
        AND un.type IN (
          'gps-guess',
          'connection-created-gps-post',
          'user-started-following',
          'user-achievement-achieved',
          'post-comment-created'
        )
        AND COALESCE((uo.notifications->>'email')::boolean, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM user_notification_reminds
          WHERE notification_id = un.id
        )
      ORDER BY un.created_at DESC
    `);

    for (const row of result.rows) {
      try {
        console.log(`Processing notification ${row.id} for user ${row.user_id}: ${row.name}`);

        const details = normalizeDetails(row.details);
        const notificationText = buildNotificationText(row.type, details);

        const emailSent = await sendUnseenNotification(row.email, notificationText);

        if (emailSent) {
          await query(
            `INSERT INTO user_notification_reminds (notification_id, sent_at) 
             VALUES ($1, now())`,
            [row.id]
          );
          console.log(`✓ Email sent for notification ${row.id}`);
        }
      } catch (err) {
        console.error(`Error processing notification ${row.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Cron job error:", err);
  }

  console.log("Cron job finished");
}
