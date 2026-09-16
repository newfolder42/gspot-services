import { query } from './db';
import { increaseUserXp } from './xp';
import { grantItemToUser, syncItemsCollectedAchievement, type ItemGrantSource } from './inventory';
import { RewardSpecSchema, RewardSpec } from '../types/reward-spec';

export type RewardContext = {
  xpAction: string;
  details?: Record<string, any>;
  itemSource?: ItemGrantSource;
};

const DEFAULT_DAILY_REWARD_LIMIT = 2;

async function grantRewardUnlock(userId: number, rewardKey: string): Promise<void> {
  await query(
    `INSERT INTO user_unlocked_rewards (user_id, reward_key) VALUES ($1, $2)
     ON CONFLICT (user_id, reward_key) DO NOTHING`,
    [userId, rewardKey]
  );
}

async function increaseDailyRewardLimit(userId: number, increase: number): Promise<void> {
  await query(
    `INSERT INTO user_reward_limits (user_id, daily_limit) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET daily_limit = user_reward_limits.daily_limit + $3,
           updated_at = now()`,
    [userId, DEFAULT_DAILY_REWARD_LIMIT + increase, increase]
  );
}

export function parseRewardSpecs(raw: unknown, source: string): RewardSpec[] {
  if (!Array.isArray(raw)) return [];

  const specs: RewardSpec[] = [];
  for (const entry of raw) {
    const parsed = RewardSpecSchema.safeParse(entry);
    if (parsed.success) {
      specs.push(parsed.data);
    } else {
      console.warn('Skipping unknown or invalid reward spec', { source, entry });
    }
  }
  return specs;
}

export async function applyRewardSpecs(
  userId: number,
  specs: RewardSpec[],
  context: RewardContext
): Promise<void> {
  for (const spec of specs) {
    try {
      switch (spec.type) {
        case 'user-xp':
          await increaseUserXp({
            userId,
            action: context.xpAction,
            xp: spec.value,
            details: context.details,
          });
          break;
        case 'reward':
          await grantRewardUnlock(userId, spec.key);
          break;
        case 'reward-limit':
          await increaseDailyRewardLimit(userId, spec.value);
          break;
        case 'item': {
          const item = await grantItemToUser(
            userId,
            spec.alias,
            context.itemSource ?? 'quest',
            context.details ?? {}
          );
          if (item) await syncItemsCollectedAchievement(userId);
          break;
        }
      }
    } catch (err) {
      console.error('Failed applying reward spec', err, { userId, spec, context });
    }
  }
}
