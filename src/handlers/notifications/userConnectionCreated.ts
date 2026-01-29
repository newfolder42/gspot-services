import { query } from '../../lib/db';
import { createNotification } from '../../lib/notifications';
import { UserConnectionCreatedEvent } from '../../types/user-connection-created';

export default async function handleNewConnection(event: UserConnectionCreatedEvent) {
  const payload = event.payload;

  if (payload.type !== 'connection') return;

  const follower = await getUserAlias(payload.userId);

  await createNotification(payload.connectionId, 'user-started-following', {
    id: +payload.id,
    followerId: +payload.userId,
    followerAlias: follower
  });
}

async function getUserAlias(userId: number) {
  try {
    const res = await query('SELECT alias FROM users WHERE id = $1', [userId]);
    return res.rows.length > 0 ? res.rows[0].alias : null;
  } catch (err) {
    console.log('getUserAlias error', err);
    return null;
  }
}