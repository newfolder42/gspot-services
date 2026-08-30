import { query, withTransaction } from '../lib/db';
import { publish } from '../lib/redis';

/**
 * Closes hide-and-seek games whose clock has run out.
 *
 * Releasing the player rows is not optional housekeeping: a partial unique index on
 * hide_and_seek_players (user_id) WHERE status = 'active' is what enforces "one active
 * game per user". Any row left at 'active' after its game ends would lock that user out
 * of every future game, with nothing in the UI to explain why.
 */
export async function endExpiredHideAndSeekGames() {
  try {
    const expired = await query(
      `SELECT id, post_id, user_id
         FROM hide_and_seek_games
        WHERE status = 'active' AND ends_at <= now()`
    );

    if (expired.rowCount === 0) return;

    console.log(`Ending ${expired.rowCount} expired hide-and-seek game(s)`);

    for (const game of expired.rows) {
      try {
        const participantIds = await withTransaction(async (client) => {
          await client.query(
            `UPDATE hide_and_seek_games
                SET status = 'ended', ended_at = now(), ended_reason = 'expired'
              WHERE id = $1 AND status = 'active'`,
            [game.id]
          );

          await client.query(
            `UPDATE hide_and_seek_players
                SET status = 'ended'
              WHERE game_id = $1 AND status = 'active'`,
            [game.id]
          );

          const all = await client.query(
            `SELECT user_id FROM hide_and_seek_players WHERE game_id = $1`,
            [game.id]
          );

          return all.rows.map((r) => Number(r.user_id));
        });

        await publish('hide_and_seek', 'ended', {
          gameId: Number(game.id),
          postId: Number(game.post_id),
          hostId: Number(game.user_id),
          reason: 'expired',
          participantIds,
        });
      } catch (err) {
        console.error('Error ending hide-and-seek game', game.id, err);
      }
    }
  } catch (err) {
    console.error('Error running endExpiredHideAndSeekGames', err);
  }
}
