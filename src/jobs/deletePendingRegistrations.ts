import { query } from '../lib/db';

export async function runDeletePendingRegistrations() {
  console.log('Running delete of old pending_registrations (older than 10 minutes)');
  try {
    // The password hash is deliberately not selected: history only needs to say who and when.
    const res = await query(
      `DELETE FROM public.pending_registrations
       WHERE created_at < NOW() - INTERVAL '10 minutes'
       RETURNING id, email, alias, name, created_at`
    );
    console.log(`Deleted ${res.rowCount || 0} pending_registrations`);

    // Best-effort, so a missing/broken history table never stops the cleanup itself.
    try {
      for (const row of res.rows) {
        await query(
          `INSERT INTO public.pending_registration_history
             (pending_id, email, alias, name, pending_created_at, outcome, detail)
           VALUES ($1, $2, $3, $4, $5, 'expired', 'removed by cleanup job')`,
          [row.id, row.email, row.alias, row.name, row.created_at]
        );
      }
    } catch (historyErr) {
      console.error('Error recording pending_registration_history', historyErr, res.rows);
    }
  } catch (err) {
    console.error('Error deleting pending_registrations', err);
  }
}
