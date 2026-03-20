import { awardOneTimeAchievement } from '../../lib/achievements';
import { UserConnectionCreatedEvent } from '../../types/user-connection-created';

export default async function handleUserConnectionAchievements(event: UserConnectionCreatedEvent) {
  if (event.payload.type !== 'connection') return;

  try {
    await awardOneTimeAchievement(event.payload.connectionId, 'base_first_follower', event.createdAt);
    await awardOneTimeAchievement(event.payload.userId, 'base_first_following', event.createdAt);
  } catch (err) {
    console.error('Failed to process connection achievements', err, event);
  }
}
