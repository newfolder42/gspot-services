import { z } from 'zod';

export const RewardSpecSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user-xp'), value: z.number().int().positive() }),
  z.object({ type: z.literal('reward'), key: z.string().min(1) }),
]);

export type RewardSpec = z.infer<typeof RewardSpecSchema>;
