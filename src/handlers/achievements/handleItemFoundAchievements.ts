import { syncItemsCollectedAchievement } from '../../lib/inventory';
import { ItemFoundEvent } from '../../types/item-found';

export default async function handleItemFoundAchievements(event: ItemFoundEvent) {
  try {
    await syncItemsCollectedAchievement(event.payload.userId);
  } catch (err) {
    console.error('Failed to process item-found achievements', err, event);
  }
}
