import { createNotification } from '../../lib/notifications';
import { UserAchievementAchievedEvent } from '../../types/user-achievement-achieved';

export default async function handleUserAchievementAchieved(event: UserAchievementAchievedEvent) {
  const { userId, achievementKey, achievementName, achievedAt, currentValue } = event.payload;

  await createNotification(userId, 'user-achievement-achieved', {
    achievementKey,
    achievementName,
    achievedAt: achievedAt ?? event.createdAt,
    ...(currentValue !== undefined && { currentValue }),
  });
}
