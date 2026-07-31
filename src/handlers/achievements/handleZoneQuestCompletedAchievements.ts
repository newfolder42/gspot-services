import { getCompletedQuestsCount, updateProgressiveAchievement } from '../../lib/achievements';
import { ZoneQuestCompletedEvent } from '../../types/zone-quest-completed';

export default async function handleZoneQuestCompletedAchievements(event: ZoneQuestCompletedEvent) {
  const userId = event.payload.userId;

  try {
    const completedQuestsTotal = await getCompletedQuestsCount(userId);
    await updateProgressiveAchievement({
      userId,
      achievementKey: 'quests_completed',
      currentValue: completedQuestsTotal,
    });
  } catch (err) {
    console.error('Failed to process zone-quest-completed achievements', err, event);
  }
}
