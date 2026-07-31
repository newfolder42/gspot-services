import { z } from 'zod';

export const UserAchievementAchievedPayloadSchema = z.object({
  userId: z.number(),
  achievementKey: z.string(),
  achievementName: z.string(),
  achievementType: z.enum(['one_time', 'progressive']),
  milestoneKey: z.string().optional(),
  milestoneName: z.string().optional(),
  achievedAt: z.string().nullable().optional(),
  currentValue: z.number().optional(),
});

export const UserAchievementAchievedSchema = z.object({
  resource: z.literal('user_achievement'),
  action: z.literal('achieved'),
  createdAt: z.string(),
  payload: UserAchievementAchievedPayloadSchema,
});

export type UserAchievementAchievedPayload = z.infer<typeof UserAchievementAchievedPayloadSchema>;
export type UserAchievementAchievedEvent = z.infer<typeof UserAchievementAchievedSchema>;
