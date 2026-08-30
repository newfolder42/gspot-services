import { query } from "./db";
import { sendExpoPush, getPushTokensForUser } from "./push";

export type NotificationRecord = {
  id: number;
  userId: number;
  userAlias?: string;
  type: string;
  details: any;
  createdAt: Date;
  seen: number | null;
  seenAt: Date | null;
};

export async function createNotification(
  userId: number,
  type: string,
  details: Record<string, any>
): Promise<number | null> {
  try {
    if (!userId || !type || !details) return null;

    const res = await query(
      `INSERT INTO user_notifications (user_id, type, details)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, type, JSON.stringify(details)]
    );

    const notifId = res.rows.length > 0 ? res.rows[0].id : null;

    // Fire push notification (non-blocking, errors are logged internally)
    sendPushForNotification(userId, type, details, notifId).catch(() => {});

    return notifId;
  } catch (err) {
    console.error('createNotification error', err);
    return null;
  }
}

type PushMessage = { title: string; body: string };

const APP_NAME = "G'Spot";

/**
 * Tray text for a notification. Anything caused by another person is titled with
 * their alias and drops it from the body — Android groups the tray by title, so
 * this gives one thread per person. Events with no human actor fall back to a
 * short category title.
 */
export function buildPushMessage(type: string, details: Record<string, any>): PushMessage {
  const by = (alias?: string | null): string => (alias ? `'${alias}` : APP_NAME);

  switch (type) {
    case 'gps-guess':
      return { title: by(details.userAlias), body: `სცადა გამოცნობა (${details.score} ქულა)` };
    case 'gps-photo-guess':
      return { title: by(details.userAlias), body: `სცადა გამოცნობა ფოტოთი (${details.score} ქულა)` };
    case 'connection-created-gps-post': {
      const postTitle = details.title?.trim();
      return {
        title: by(details.authorAlias),
        body: postTitle ? `გამოაქვეყნა: ${postTitle}` : 'გამოაქვეყნა ახალი პოსტი',
      };
    }
    case 'connection-created-quest-post':
      return { title: by(details.authorAlias), body: `შეასრულა მისია: ${details.title}` };
    case 'gps-post-failed': {
      const postTitle = details.title?.trim();
      return {
        title: 'პოსტი',
        body: postTitle ? `პოსტი "${postTitle}" ვერ განთავსდა` : 'შენი პოსტი ვერ განთავსდა',
      };
    }
    case 'user-started-following':
      return { title: by(details.followerAlias), body: 'გახდა შენი ფოლოვერი' };
    case 'user-achievement-achieved':
      return {
        title: 'მიღწევა',
        body: `ახალი მიღწევა: ${details.milestoneName ?? details.achievementName}`,
      };
    case 'post-comment-created':
      return {
        title: by(details.commenterAlias),
        body: details.parent ? 'დაგიტოვა კომენტარი' : 'დატოვა კომენტარი',
      };
    case 'post-vote-created':
      return {
        title: by(details.voterAlias),
        body: details.value === 1 ? 'მოიწონა შენი პოსტი' : 'არ მოიწონა შენი პოსტი',
      };
    case 'comment-vote-created':
      return {
        title: by(details.voterAlias),
        body: details.value === 1 ? 'მოიწონა შენი კომენტარი' : 'არ მოიწონა შენი კომენტარი',
      };
    case 'post-reward-created':
      return { title: by(details.giverAlias), body: `დააჯილდოვა შენი პოსტი: ${details.rewardName}` };
    case 'comment-reward-created':
      if (details.targetType === 'hide-and-seek-check')
        return { title: by(details.giverAlias), body: details.rewardName };
      if (details.targetType === 'comment')
        return { title: by(details.giverAlias), body: `დააჯილდოვა შენი კომენტარი: ${details.rewardName}` };
      return { title: by(details.giverAlias), body: `დააჯილდოვა შენი გამოცნობა: ${details.rewardName}` };
    case 'feed-event-reaction':
      return { title: by(details.reactorAlias), body: 'მოიწონა შენი ამბავი' };
    case 'zone-member-invitation':
      return { title: by(details.userAlias), body: `მოგიწვია საბზონაში: ${details.zoneSlug}` };
    case 'zone-quest-created':
      return details.character?.name
        ? { title: details.character.name, body: `შენთვის ახალი მისია აქვს: ${details.questTitle}` }
        : { title: 'მისია', body: `ახალი მისია: ${details.questTitle}` };
    case 'zone-quest-completed':
      return { title: 'მისია', body: `შესრულებულია: ${details.questTitle}` };
    case 'zone-quest-objective-rejected':
      return { title: 'მისია', body: `ამოცანა "${details.objectiveTitle ?? ''}" დაიწუნა, სცადე თავიდან` };
    case 'zone-quest-objective-accepted':
      return { title: 'მისია', body: `ამოცანა "${details.objectiveTitle ?? ''}" დადასტურდა` };
    case 'zone-quest-objective-submitted':
      return {
        title: by(details.submitterAlias),
        body: `გამოაგზავნა "${details.objectiveTitle ?? ''}" შესაფასებლად`,
      };
    case 'connection-completed-zone-quest':
      return { title: by(details.userAlias), body: `შეასრულა მისია: ${details.questTitle}` };
    case 'hide-and-seek-created':
      return { title: by(details.hostAlias), body: `დაიწყო დამალობანა: ${details.title}` };
    case 'hide-and-seek-joined':
      return { title: by(details.userAlias), body: 'შენს დამალობანაში ჩაერთო' };
    case 'hide-and-seek-checked':
      return { title: by(details.userAlias), body: `მოგიახლოვდა ${details.distanceMeters} მეტრზე` };
    case 'hide-and-seek-found':
      return details.role === 'host'
        ? { title: by(details.userAlias), body: 'გიპოვა!' }
        : { title: 'დამალობანა', body: `იპოვე ${details.hostAlias}!` };
    case 'hide-and-seek-ended':
      return { title: 'დამალობანა', body: `დასრულდა: ${details.title}` };
    default:
      return { title: APP_NAME, body: 'ახალი შეტყობინება' };
  }
}

/**
 * Pushes a notification to every device the user has registered.
 */
async function sendPushForNotification(
  userId: number,
  type: string,
  details: Record<string, any>,
  notificationId: number | null
) {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) return;

  const { title, body } = buildPushMessage(type, details);

  // `notificationId` lets the app mark the row read when the push is tapped.
  const data = { type, notificationId, ...details };

  await Promise.all(tokens.map((t) => sendExpoPush(t, title, body, data)));
}
