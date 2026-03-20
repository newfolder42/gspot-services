import { z } from 'zod';

const NumericString = z.string().regex(/^[0-9]+$/);

export const UserLevelChangedSchema = z.object({
  resource: z.literal('user'),
  action: z.enum(['level-up', 'level-down']),
  createdAt: z.string(),
  payload: z.object({
    userId: z.union([z.number(), NumericString]),
    previousLevel: z.number(),
    newLevel: z.number(),
    totalXP: z.number().optional(),
    action: z.string().optional(),
  }),
});

export type UserLevelChangedEvent = z.infer<typeof UserLevelChangedSchema>;
