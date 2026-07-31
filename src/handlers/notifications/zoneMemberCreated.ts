import { createNotification } from '../../lib/notifications';
import { ZoneMemberAddedEvent } from '../../types/zone-member-added';

export default async function handlezoneMemberCreated(event: ZoneMemberAddedEvent) {
  const payload = event.payload;
  const status = payload.status;

  if (status == 'pending') {
    await createNotification(payload.userId, 'zone-member-invitation', {
      zoneSlug: payload.zoneSlug,
      userAlias: payload.userAlias,
    });
  }
}
