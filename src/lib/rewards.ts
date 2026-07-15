import { query } from './db';
import { increaseUserXp } from './xp';
import { RewardSpecSchema, RewardSpec } from '../types/reward-spec';

export type RewardContext = {
  xpAction: string;
  details?: Record<string, any>;
};

async function grantRewardUnlock(userId: number, rewardKey: string): Promise<void> {
  await query(
    `INSERT INTO user_unlocked_rewards (user_id, reward_key) VALUES ($1, $2)
     ON CONFLICT (user_id, reward_key) DO NOTHING`,
    [userId, rewardKey]
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
      }
    } catch (err) {
      console.error('Failed applying reward spec', err, { userId, spec, context });
    }
  }
}
