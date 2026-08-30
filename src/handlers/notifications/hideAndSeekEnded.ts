import { query } from '../../lib/db';
import { createNotification } from '../../lib/notifications';
import { HideAndSeekEndedEvent } from '../../types/hide-and-seek';

export default async function handleHideAndSeekEnded(event: HideAndSeekEndedEvent) {
  const payload = event.payload;

  const res = await query(
    `SELECT p.title, u.alias AS host_alias
       FROM hide_and_seek_games g
       JOIN posts p ON p.id = g.post_id
       JOIN users u ON u.id = g.user_id
      WHERE g.id = $1
      LIMIT 1`,
    [payload.gameId]
  );

  const title = res.rows[0]?.title ?? '';
  const hostAlias = res.rows[0]?.host_alias ?? '';

  for (const userId of payload.participantIds) {
    await createNotification(userId, 'hide-and-seek-ended', {
      gameId: payload.gameId,
      postId: payload.postId,
      title,
      hostId: payload.hostId,
      hostAlias,
      role: userId === payload.hostId ? 'host' : 'seeker',
      reason: payload.reason,
    });
  }
}
