import { createNotification } from '../../lib/notifications';
import { UserAchievementAchievedEvent } from '../../types/user-achievement-achieved';

export default async function handleUserAchievementAchieved(event: UserAchievementAchievedEvent) {
  const { userId, achievementKey, achievementName, achievementType, milestoneKey, milestoneName, achievedAt, currentValue } = event.payload;

  await createNotification(userId, 'user-achievement-achieved', {
    achievementKey,
    achievementName,
    achievementType,
    ...(milestoneKey !== undefined && { milestoneKey }),
    ...(milestoneName !== undefined && { milestoneName }),
    achievedAt: achievedAt ?? event.createdAt,
    ...(currentValue !== undefined && { currentValue }),
  });
}
