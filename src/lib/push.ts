import { query } from "./db";

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type ExpoPushTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // Expo push tokens look like ExponentPushToken[xxx]
  if (!pushToken?.startsWith('ExponentPushToken[')) return;

  try {
    const res = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { data?: ExpoPushTicket | ExpoPushTicket[] }
      | null;
    const ticket = Array.isArray(json?.data) ? json?.data[0] : json?.data;
    if (!ticket || ticket.status !== 'error') return;

    // App uninstalled or notifications revoked — drop the token instead of
    // retrying it on every future notification for this user.
    if (ticket.details?.error === 'DeviceNotRegistered') {
      await deletePushToken(pushToken);
      return;
    }

    console.error('sendExpoPush ticket error', ticket.details?.error ?? ticket.message);
  } catch (err) {
    console.error('sendExpoPush failed', err);
  }
}

/** Returns all push tokens registered for a given user. */
export async function getPushTokensForUser(userId: number): Promise<string[]> {
  try {
    const res = await query(
      `SELECT token FROM mobile_push_tokens WHERE user_id = $1`,
      [userId]
    );
    return res.rows.map((r: { token: string }) => r.token);
  } catch {
    return [];
  }
}

export type PostPushImages = { imageThumb?: string; imageFeed?: string };

/**
 * One post fans out to every connection, so the same lookup would otherwise run
 * once per recipient. A minute is far longer than a fan-out takes and far
 * shorter than a rendition URL lives, so staleness is not a concern.
 */
const POST_IMAGE_TTL_MS = 60_000;
const postImageCache = new Map<number, { at: number; value: PostPushImages }>();

/**
 * The small renditions of a post's first photo, for the app to warm its image
 * cache with when the push arrives (mobile lib/imagePrefetch.ts).
 *
 * These ride on the push payload only — they are deliberately not written into
 * the stored notification `details`, which would put two URLs on every
 * notification row for something that is only useful in the seconds before a
 * tap.
 */
export async function getPostPushImages(postId: number): Promise<PostPushImages> {
  const hit = postImageCache.get(postId);
  if (hit && Date.now() - hit.at < POST_IMAGE_TTL_MS) return hit.value;

  const value: PostPushImages = {};
  try {
    const res = await query(
      `SELECT uc.details
       FROM post_content pc
       JOIN user_content uc ON uc.id = pc.content_id
       WHERE pc.post_id = $1
       ORDER BY pc.sort
       LIMIT 1`,
      [postId]
    );

    const variants = res.rows[0]?.details?.variants;
    if (variants?.thumb) value.imageThumb = variants.thumb;
    if (variants?.feed) value.imageFeed = variants.feed;
  } catch {
    // A push without prefetch hints is still a perfectly good push.
  }

  // Cached even when empty — a post with no renditions should not be re-queried
  // once per recipient either.
  postImageCache.set(postId, { at: Date.now(), value });
  if (postImageCache.size > 500) {
    for (const [key, entry] of postImageCache) {
      if (Date.now() - entry.at >= POST_IMAGE_TTL_MS) postImageCache.delete(key);
    }
  }

  return value;
}

/** Removes a token that is no longer deliverable. */
export async function deletePushToken(token: string): Promise<void> {
  try {
    await query(`DELETE FROM mobile_push_tokens WHERE token = $1`, [token]);
  } catch (err) {
    console.error('deletePushToken error', err);
  }
}
