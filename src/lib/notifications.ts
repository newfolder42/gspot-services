import { query, withTransaction } from "./db";
import { sendExpoPush, getPushTokensForUser, getPostPushImages } from "./push";
import { locationDisputeReasonLabel } from "./locationDisputes";

export type NotificationRecord = {
  id: number;
  userId: number;
  userAlias?: string;
  type: string;
  details: any;
  createdAt: Date;
  updatedAt: Date;
  seen: number | null;
  seenAt: Date | null;
};

/**
 * One person in a notification grouped by people. Identity only, on purpose: whatever a
 * type needs to say about the latest person (a guess's score) stays in its flat details,
 * so this shape is the same for every type that groups by people.
 */
export type GroupUser = { userId: number; alias: string };

export type GroupedNotificationInput = {
  /** who receives it */
  userId: number;
  type: string;
  /**
   * Names the object the notification is about ('post-vote:123'). One row exists per
   * (recipient, groupKey); everything that shares the key lands in that row.
   */
  groupKey: string;
  /** whoever just did the thing; joins the row's `users` */
  actor: GroupUser;
  /**
   * The same flat details an ungrouped notification of this type carries. They describe
   * the latest actor, which is what an app version that predates grouping reads.
   */
  details: Record<string, any>;
  /**
   * By default someone already in an unread group acting again changes nothing the
   * recipient would care about, so it is neither re-pushed nor moved to the top. Set this
   * when a repeat is news in itself (the same person submitting another objective).
   */
  renotifyRepeat?: boolean;
};

/** Names kept per grouped row; `count` keeps counting past it. */
export const GROUP_USERS_CAP = 20;
/** Names that travel in a push payload (Expo caps the whole payload at about 4KB). */
const PUSH_USERS_CAP = 5;

/**
 * Folds one more person into a group-by-people notification's details: `users` (newest
 * first, capped) and `userCount` (everyone, past the cap). This is the only place that
 * knows the group is made of people; a type grouped by something else would get its own.
 * A group the recipient has already read starts over: they were told about those people,
 * so "A and 3 others" would repeat news.
 */
export function mergeGroupDetails(
  prev: Record<string, any> | null,
  restart: boolean,
  actor: GroupUser,
  latest: Record<string, any>
): { details: Record<string, any>; isRepeat: boolean } {
  const prevUsers: GroupUser[] = !restart && Array.isArray(prev?.users) ? prev!.users : [];
  const prevCount = restart ? 0 : Number(prev?.userCount) || prevUsers.length;
  const isRepeat = prevUsers.some((u) => u.userId === actor.userId);

  const users = [{ userId: actor.userId, alias: actor.alias }, ...prevUsers.filter((u) => u.userId !== actor.userId)].slice(
    0,
    GROUP_USERS_CAP
  );
  const userCount = isRepeat ? Math.max(prevCount, users.length) : prevCount + 1;

  return { details: { ...latest, users, userCount }, isRepeat };
}

/**
 * Creates the grouped notification for (userId, groupKey), or folds the actor into the one
 * that already exists: details are rewritten, `seen` is reset and `updated_at` moves, so
 * the recipient is told again, and the row jumps back to the top of their list.
 *
 * Old app versions keep working because `details` still holds the flat fields they read
 * (as of the latest actor); `users` and `count` are additions only new versions look at.
 */
export async function upsertGroupedNotification(input: GroupedNotificationInput): Promise<number | null> {
  const { userId, type, groupKey, actor, details, renotifyRepeat } = input;

  try {
    if (!userId || !type || !groupKey || !details || !actor?.userId) return null;

    const outcome = await withTransaction(async (client) => {
      // Two events for one group can be in flight at once. The row lock serialises
      // updates; the unique index decides who creates the row when there is none yet,
      // and the loser simply goes around again to find it.
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await client.query(
          `SELECT id, details, seen
           FROM user_notifications
           WHERE user_id = $1 AND group_key = $2
           FOR UPDATE`,
          [userId, groupKey]
        );
        const row = existing.rows[0];

        if (!row) {
          const merged = mergeGroupDetails(null, true, actor, details);
          const inserted = await client.query(
            `INSERT INTO user_notifications (user_id, type, details, group_key)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, group_key) WHERE group_key IS NOT NULL DO NOTHING
             RETURNING id`,
            [userId, type, JSON.stringify(merged.details), groupKey]
          );
          if (inserted.rows[0]) return { id: Number(inserted.rows[0].id), details: merged.details, push: true };
          continue;
        }

        const wasSeen = row.seen === 1;
        const prev = (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) ?? {};
        const merged = mergeGroupDetails(prev, wasSeen, actor, details);

        if (merged.isRepeat && !wasSeen && !renotifyRepeat) {
          // Same person again on a group nobody has read yet: nothing the recipient would
          // care about changed, so the row neither moves nor pings.
          return { id: Number(row.id), details: prev, push: false };
        }

        await client.query(
          `UPDATE user_notifications
           SET details = $2, seen = 0, seen_at = NULL, updated_at = now()
           WHERE id = $1`,
          [row.id, JSON.stringify(merged.details)]
        );
        return { id: Number(row.id), details: merged.details, push: true };
      }
      return null;
    });

    if (!outcome) return null;

    if (outcome.push) {
      // Fire push notification (non-blocking, errors are logged internally)
      sendPushForNotification(userId, type, outcome.details, outcome.id).catch(() => {});
    }

    return outcome.id;
  } catch (err) {
    console.error('upsertGroupedNotification error', err);
    return null;
  }
}

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

  // A grouped notification keeps the latest actor as the title and counts the rest in
  // the body: "'A" / "და კიდევ 2-მა მოიწონეს შენი პოსტი".
  const others = Math.max(0, (Number(details.userCount) || 1) - 1);
  const andOthers = (rest: string): string => `და კიდევ ${others}-მა ${rest}`;

  switch (type) {
    case 'gps-guess':
      if (others > 0) return { title: by(details.userAlias), body: andOthers('სცადეს გამოცნობა') };
      return { title: by(details.userAlias), body: `სცადა გამოცნობა (${details.score} ქულა)` };
    case 'gps-photo-guess':
      if (others > 0) return { title: by(details.userAlias), body: andOthers('სცადეს გამოცნობა ფოტოთი') };
      return { title: by(details.userAlias), body: `სცადა გამოცნობა ფოტოთი (${details.score} ქულა)` };
    case 'connection-created-gps-post': {
      const postTitle = details.title?.trim();
      return {
        title: by(details.authorAlias),
        body: postTitle ? `გამოაქვეყნა: ${postTitle}` : 'გამოაქვეყნა ახალი პოსტი',
      };
    }
    case 'connection-created-quest-post':
      return { title: by(details.authorAlias), body: `შეასრულა მისია: "${details.title}"` };
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
      if (others > 0) return { title: by(details.voterAlias), body: andOthers('მოიწონეს შენი პოსტი') };
      return {
        title: by(details.voterAlias),
        body: details.value === 1 ? 'მოიწონა შენი პოსტი' : 'არ მოიწონა შენი პოსტი',
      };
    case 'comment-vote-created':
      if (others > 0) {
        return {
          title: by(details.voterAlias),
          body: andOthers(details.targetType === 'guess-comment' ? 'მოიწონეს შენი გამოცნობა' : 'მოიწონეს შენი კომენტარი'),
        };
      }
      return {
        title: by(details.voterAlias),
        body: details.targetType === 'guess-comment'
          ? (details.value === 1 ? 'მოიწონა შენი გამოცნობა' : 'არ მოიწონა შენი გამოცნობა')
          : (details.value === 1 ? 'მოიწონა შენი კომენტარი' : 'არ მოიწონა შენი კომენტარი'),
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
      if (others > 0) return { title: by(details.reactorAlias), body: andOthers('მოიწონეს შენი ამბავი') };
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
      if (others > 0) {
        return { title: by(details.submitterAlias), body: andOthers(`გამოაგზავნეს ამოცანები შესაფასებლად: ${details.questTitle ?? ''}`) };
      }
      return {
        title: by(details.submitterAlias),
        body: `გამოაგზავნა "${details.objectiveTitle ?? ''}" შესაფასებლად`,
      };
    case 'connection-completed-zone-quest':
      if (others > 0) return { title: by(details.userAlias), body: andOthers(`შეასრულეს მისია: "${details.questTitle}"`) };
      return { title: by(details.userAlias), body: `შეასრულა მისია: "${details.questTitle}"` };
    case 'hide-and-seek-created':
      return { title: by(details.hostAlias), body: `დაიწყო დამალობანა: ${details.title}` };
    case 'hide-and-seek-joined':
      if (others > 0) return { title: by(details.userAlias), body: `და კიდევ ${others} შენს დამალობანაში ჩაერთნენ` };
      return { title: by(details.userAlias), body: 'შენს დამალობანაში ჩაერთო' };
    case 'hide-and-seek-checked':
      return { title: by(details.userAlias), body: `მოგიახლოვდა ${details.distanceMeters} მეტრზე` };
    case 'hide-and-seek-found':
      return details.role === 'host'
        ? { title: by(details.userAlias), body: 'გიპოვა!' }
        : { title: 'დამალობანა', body: `იპოვე ${details.hostAlias}!` };
    case 'hide-and-seek-ended':
      return { title: 'დამალობანა', body: `დასრულდა: ${details.title}` };
    case 'item-found':
      return { title: 'ინვენტარი', body: `შენს ინვენტარში მატებაა - ${details.itemName}` };
    case 'post-location-disputed': {
      const reason = locationDisputeReasonLabel(details.reason);
      return {
        title: by(details.reporterAlias),
        body: reason ? `გაასაჩივრა პოსტის ლოკაცია: ${reason}` : 'გაასაჩივრა პოსტის ლოკაცია',
      };
    }
    case 'post-location-flagged': {
      const reason = locationDisputeReasonLabel(details.reason);
      return {
        title: 'პოსტი',
        body: reason ? `შენი პოსტის ლოკაცია გასაჩივრდა: ${reason}` : 'შენი პოსტის ლოკაცია გასაჩივრდა',
      };
    }
    case 'post-location-correction-needed': {
      const note = typeof details.note === 'string' ? details.note.trim().slice(0, 120) : '';
      return {
        title: 'პოსტი',
        body: note ? `შენი პოსტი შეჩერდა, გაასწორე ლოკაცია — ${note}` : 'შენი პოსტი შეჩერდა, გაასწორე ლოკაცია',
      };
    }
    case 'post-suspended':
      return { title: by(details.actorAlias), body: 'შეაჩერა პოსტი ლოკაციის გამო' };
    case 'post-location-corrected':
      return { title: by(details.authorAlias), body: 'გაასწორა პოსტის ლოკაცია, პოსტი აღდგა' };
    case 'post-discarded':
      return { title: 'პოსტი', body: 'შენი პოსტი სამუდამოდ შეჩერებულია' };
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

  // Anything that opens a post ships that post's small renditions, so the app can
  // warm its image cache while the notification sits in the tray instead of
  // starting the download only once the user has tapped through.
  const postId = Number(details.postId);
  const images = Number.isInteger(postId) && postId > 0 ? await getPostPushImages(postId) : {};

  // A grouped row can list up to GROUP_USERS_CAP people; the push only needs the first few.
  const pushDetails = Array.isArray(details.users)
    ? { ...details, users: details.users.slice(0, PUSH_USERS_CAP) }
    : details;

  // `notificationId` lets the app mark the row read when the push is tapped.
  const data = { type, notificationId, ...pushDetails, ...images };

  await Promise.all(tokens.map((t) => sendExpoPush(t, title, body, data)));
}
