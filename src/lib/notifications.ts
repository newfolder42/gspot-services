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
    sendPushForNotification(userId, type, details).catch(() => {});

    return notifId;
  } catch (err) {
    console.error('createNotification error', err);
    return null;
  }
}

/**
 * Builds the tray text for a notification and pushes it to every device the
 * user has registered. Mirrors the same switch in gspot-web's lib/notifications.ts —
 * keep the two in sync when adding a notification type.
 */
async function sendPushForNotification(userId: number, type: string, details: Record<string, any>) {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) return;

  let body = 'ახალი შეტყობინება';
  switch (type) {
    case 'gps-guess':
      body = `${details.userAlias}-მა სცადა გამოცნობა (${details.score} ქულა)`;
      break;
    case 'gps-photo-guess':
      body = `${details.userAlias}-მა სცადა გამოცნობა ფოტოთი (${details.score} ქულა)`;
      break;
    case 'connection-created-gps-post': {
      const title = details.title?.trim();
      body = title ? `${details.authorAlias}-მა გამოაქვეყნა: ${title}` : `${details.authorAlias}-მა გამოაქვეყნა ახალი პოსტი`;
      break;
    }
    case 'connection-created-quest-post':
      body = `${details.authorAlias}-მა შეასრულა მისია: ${details.title}`;
      break;
    case 'gps-post-failed': {
      const title = details.title?.trim();
      body = title ? `პოსტი "${title}" ვერ განთავსდა` : 'შენი პოსტი ვერ განთავსდა';
      break;
    }
    case 'user-started-following':
      body = `ახალი ფოლოვერი: ${details.followerAlias}`;
      break;
    case 'user-achievement-achieved':
      body = `ახალი მიღწევა: ${details.milestoneName ?? details.achievementName}`;
      break;
    case 'post-comment-created':
      body = details.parent
        ? `${details.commenterAlias}-მა დაგიტოვა კომენტარი`
        : `${details.commenterAlias}-მა დატოვა კომენტარი`;
      break;
    case 'post-vote-created':
      body = details.value === 1
        ? `${details.voterAlias}-მა მოიწონა შენი პოსტი`
        : `${details.voterAlias}-მა არ მოიწონა შენი პოსტი`;
      break;
    case 'comment-vote-created':
      body = details.value === 1
        ? `${details.voterAlias}-მა მოიწონა შენი კომენტარი`
        : `${details.voterAlias}-მა არ მოიწონა შენი კომენტარი`;
      break;
    case 'post-reward-created':
      body = `${details.giverAlias}-მა დააჯილდოვა შენი პოსტი: ${details.rewardName}`;
      break;
    case 'comment-reward-created':
      body = `${details.giverAlias}-მა დააჯილდოვა შენი გამოცნობა: ${details.rewardName}`;
      break;
    case 'zone-member-invitation':
      body = `${details.userAlias}-მა მოგიწვია საბზონაში: ${details.zoneSlug}`;
      break;
    case 'zone-quest-created':
      body = details.character?.name
        ? `${details.character.name}ს შენთვის ახალი მისია აქვს: ${details.questTitle}`
        : `ახალი მისია: ${details.questTitle}`;
      break;
    case 'zone-quest-completed':
      body = `მისია შესრულებულია: ${details.questTitle}`;
      break;
    case 'zone-quest-objective-rejected':
      body = `ამოცანა "${details.objectiveTitle ?? ''}" დაიწუნა, სცადე თავიდან`;
      break;
    case 'zone-quest-objective-accepted':
      body = `ამოცანა "${details.objectiveTitle ?? ''}" დადასტურდა`;
      break;
    case 'zone-quest-objective-submitted':
      body = `${details.submitterAlias}-მა გამოაგზავნა "${details.objectiveTitle ?? ''}" შესაფასებლად`;
      break;
    case 'connection-completed-zone-quest':
      body = `${details.userAlias}-მა შეასრულა მისია: ${details.questTitle}`;
      break;
  }

  await Promise.all(tokens.map((t) => sendExpoPush(t, 'G\'Spot', body, { type, ...details })));
}
