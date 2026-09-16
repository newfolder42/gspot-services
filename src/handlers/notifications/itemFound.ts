import { createNotification } from '../../lib/notifications';
import { ItemFoundEvent } from '../../types/item-found';

export default async function handleItemFound(event: ItemFoundEvent) {
  const payload = event.payload;

  await createNotification(payload.userId, 'item-found', {
    postId: payload.postId,
    itemAlias: payload.itemAlias,
    itemName: payload.itemName,
    itemQuality: payload.itemQuality,
    itemIconUrl: payload.itemIconUrl,
    itemCount: payload.itemCount,
    locationName: payload.locationName,
  });
}
