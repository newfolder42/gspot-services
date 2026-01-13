import { query } from './db';

export async function runUserCronJob() {
  console.log("Cron job started at", new Date().toISOString());

  try {
    const result = await query("SELECT id, name FROM users where 1 = 2");
    for (const row of result.rows) {
      console.log(`Processing user ${row.id}: ${row.name}`);
    }
  } catch (err) {
    console.error("Cron job error:", err);
  }

  console.log("Cron job finished");
}
