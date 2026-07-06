import { query } from '../lib/db';

export async function deleteOldFeedEvents() {
  console.log('Running delete of old feed_events (older than 3 days)');
  try {
    const res = await query(
      "DELETE FROM public.feed_events WHERE created_at < NOW() - INTERVAL '3 days'"
    );
    console.log(`Deleted ${res.rowCount || 0} feed_events`);
  } catch (err) {
    console.error('Error deleting feed_events', err);
  }
}
