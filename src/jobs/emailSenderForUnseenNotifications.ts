import { query } from '../lib/db';
import { sendUnseenNotification } from '../lib/email';

function buildNotificationText(type: string, details: any): string {
  switch (type) {
    case 'gps-guess':
      return `შენს პოსტზე სცადეს გამოცნობა (${details.score} ქულა)`;
    
    case 'connection-created-gps-post':
      return `${details.authorAlias}-მა ახალი პოსტი გამოაქვეყნა'${details.title ? '' : ': ' + details.title}'`;
    
    case 'user-started-following':
      return `გილოცავ, შენ შეგეძინა ახალი ფოლოვერი!\n\n${details.followerAlias}`;
    
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
        AND un.type IN ('gps-guess', 'connection-created-gps-post', 'user-started-following')
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

        const notificationText = buildNotificationText(row.type, row.details);

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
