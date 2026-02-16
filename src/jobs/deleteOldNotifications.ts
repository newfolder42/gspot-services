import { query } from '../lib/db';

export async function deleteOldNotifications() {
  console.log('Running delete of old user_notifications (older than 1 week)');
  try {
    const res = await query(
      "DELETE FROM public.user_notifications WHERE created_at < NOW() - INTERVAL '1 week'"
    );
    console.log(`Deleted ${res.rowCount || 0} user_notifications`);
  } catch (err) {
    console.error('Error deleting user_notifications', err);
  }
}
