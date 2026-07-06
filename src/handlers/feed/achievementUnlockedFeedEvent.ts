import { createAchievementUnlockedEvent } from '../../lib/feedEvents';
import { UserAchievementAchievedEvent } from '../../types/user-achievement-achieved';

export default async function handleAchievementUnlockedFeedEvent(event: UserAchievementAchievedEvent) {
  const { userId, achievementKey, achievementName, achievementType, milestoneKey, milestoneName, achievedAt } = event.payload;

  if (achievementType === 'progressive' && !milestoneKey) {
    return;
  }

  await createAchievementUnlockedEvent({
    userId,
    achievementKey,
    achievementName,
    achievementType,
    milestoneKey,
    milestoneName,
    achievedAt: achievedAt ?? event.createdAt,
  });
}
