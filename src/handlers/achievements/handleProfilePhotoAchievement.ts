import { awardOneTimeAchievement } from '../../lib/achievements';
import { UserProfilePhotoChangedEvent } from '../../types/user-profile-photo-changed';

export default async function handleProfilePhotoAchievement(event: UserProfilePhotoChangedEvent) {
  try {
    await awardOneTimeAchievement(event.payload.userId, 'base_profile_photo', event.createdAt);
  } catch (err) {
    console.error('Failed to process base_profile_photo achievement', err, event);
  }
}
