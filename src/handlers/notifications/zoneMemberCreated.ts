import { createNotification } from '../../lib/notifications';
import { ZoneMemberAdded } from '../../types/zonemember-added';

export default async function handlezoneMemberCreated(event: ZoneMemberAdded) {
  const payload = event.payload;
  const status = payload.status;

  if (status == 'pending') {
    await createNotification(payload.userId, 'zone-member-invitation', {
      zoneSlug: payload.zoneSlug,
      userAlias: payload.userAlias,
    });
  }
}
