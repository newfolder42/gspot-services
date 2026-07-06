import { query } from './db';

/**
 * feed_events ("ამბები") writer. One row per happening, no destination user.
 * `details` is a self-contained snapshot so the web/mobile viewer can render
 * without extra joins.
 */

type FeedEventType = 'quest_completed' | 'achievement_unlocked';

type QuestPhoto = {
  url: string;
  thumb: string | null;
  feed: string | null;
  objectiveTitle: string | null;
};

async function insertFeedEvent(
  actorId: number,
  type: FeedEventType,
  groupKey: string,
  refId: number | null,
  details: Record<string, any>
): Promise<void> {
  await query(
    `INSERT INTO feed_events (actor_id, type, group_key, ref_id, details)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (actor_id, type, group_key) DO NOTHING`,
    [actorId, type, groupKey, refId, JSON.stringify(details)]
  );
}

async function getQuestCharacterAvatar(questId: number): Promise<string | null> {
  const res = await query(
    `SELECT zc.avatar_url
     FROM zone_quests zq
     LEFT JOIN zone_quest_characters zc ON zc.id = zq.character_id
     WHERE zq.id = $1
     LIMIT 1`,
    [questId]
  );
  return res.rows[0]?.avatar_url ?? null;
}

async function getUserQuestPhotos(questId: number, userId: number): Promise<QuestPhoto[]> {
  const res = await query(
    `SELECT zqo.title AS objective_title, uqo.photo_url, uqo.capture_data
     FROM user_quests uq
     JOIN user_quest_objectives uqo ON uqo.user_quest_id = uq.id
     JOIN zone_quest_objectives zqo ON zqo.id = uqo.objective_id
     WHERE uq.quest_id = $1 AND uq.user_id = $2 AND uqo.status = 'completed'
       AND uqo.photo_url IS NOT NULL
     ORDER BY zqo.sort_order ASC
     LIMIT 6`,
    [questId, userId]
  );

  return res.rows
    .filter((r: any) => r.photo_url)
    .map((r: any) => {
      const variants = r.capture_data?.variants ?? null;
      return {
        url: r.photo_url,
        thumb: variants?.thumb ?? null,
        feed: variants?.feed ?? null,
        objectiveTitle: r.objective_title ?? null,
      };
    });
}

async function getQuestPostId(questId: number): Promise<number | null> {
  const res = await query(
    `SELECT post_id FROM post_quest_completions WHERE quest_id = $1 LIMIT 1`,
    [questId]
  );
  return res.rows[0]?.post_id != null ? Number(res.rows[0].post_id) : null;
}

export async function createQuestCompletedEvent(payload: {
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  userId: number;
  userAlias: string;
}): Promise<void> {
  const [characterAvatar, photos, postId] = await Promise.all([
    getQuestCharacterAvatar(payload.questId),
    getUserQuestPhotos(payload.questId, payload.userId),
    getQuestPostId(payload.questId),
  ]);

  await insertFeedEvent(
    payload.userId,
    'quest_completed',
    `quest:${payload.questId}`,
    payload.questId,
    {
      questId: payload.questId,
      questTitle: payload.questTitle,
      zoneId: payload.zoneId,
      zoneSlug: payload.zoneSlug,
      userAlias: payload.userAlias,
      characterAvatar,
      postId,
      photos,
    }
  );
}

async function getAchievementImage(
  achievementKey: string,
  milestoneKey?: string
): Promise<string | null> {
  const res = await query(
    `SELECT COALESCE(am.image_url, a.image_url) AS image_url
     FROM achievements a
     LEFT JOIN achievement_milestones am
       ON am.achievement_id = a.id AND am.key = $2
     WHERE a.key = $1
     LIMIT 1`,
    [achievementKey, milestoneKey ?? null]
  );
  return res.rows[0]?.image_url ?? null;
}

export async function createAchievementUnlockedEvent(payload: {
  userId: number;
  achievementKey: string;
  achievementName: string;
  achievementType: 'one_time' | 'progressive';
  milestoneKey?: string;
  milestoneName?: string;
  achievedAt?: string | null;
}): Promise<void> {
  const imageUrl = await getAchievementImage(payload.achievementKey, payload.milestoneKey);

  const groupKey = `achv:${payload.achievementKey}:${payload.milestoneKey ?? '-'}`;

  await insertFeedEvent(
    payload.userId,
    'achievement_unlocked',
    groupKey,
    null,
    {
      achievementKey: payload.achievementKey,
      achievementName: payload.achievementName,
      achievementType: payload.achievementType,
      milestoneKey: payload.milestoneKey ?? null,
      milestoneName: payload.milestoneName ?? null,
      imageUrl,
      achievedAt: payload.achievedAt ?? null,
    }
  );
}
