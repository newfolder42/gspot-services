import { updateProgressiveAchievement } from '../../lib/achievements';
import { UserLevelChangedEvent } from '../../types/user-level-changed';

export default async function handleUserLevelChangedAchievements(event: UserLevelChangedEvent) {
  const userId = Number(event.payload.userId);
  const newLevel = Number(event.payload.newLevel);

  if (Number.isNaN(userId) || Number.isNaN(newLevel)) {
    console.warn('Invalid level-changed event payload', event);
    return;
  }

  try {
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'level_reached',
      currentValue: newLevel,
      achievedAtIso: event.createdAt,
      enforceMonotonicIncrease: true,
    });
  } catch (err) {
    console.error('Failed to process level_reached achievement', err, event);
  }
}
