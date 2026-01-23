import { query } from '../lib/db';

export async function runDeletePendingRegistrations() {
  console.log('Running delete of old pending_registrations (older than 10 minutes)');
  try {
    const res = await query(
      "DELETE FROM public.pending_registrations WHERE created_at < NOW() - INTERVAL '10 minutes'"
    );
    console.log(`Deleted ${res.rowCount || 0} pending_registrations`);
  } catch (err) {
    console.error('Error deleting pending_registrations', err);
  }
}
