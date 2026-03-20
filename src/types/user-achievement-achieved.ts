import { z } from 'zod';

export const UserAchievementAchievedSchema = z.object({
  resource: z.literal('user_achievement'),
  action: z.literal('achieved'),
  createdAt: z.string(),
  payload: z.object({
    userId: z.number(),
    achievementKey: z.string(),
    achievementName: z.string(),
    achievedAt: z.string().nullable().optional(),
    currentValue: z.number().optional(),
  }),
});

export type UserAchievementAchievedEvent = z.infer<typeof UserAchievementAchievedSchema>;
