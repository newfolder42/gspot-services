import { z } from 'zod';

export const ZoneQuestCompletedSchema = z.object({
  resource: z.literal('zone_quest'),
  action: z.literal('completed'),
  createdAt: z.string(),
  payload: z.object({
    questId: z.number(),
    questTitle: z.string(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    userId: z.number(),
    userAlias: z.string(),
  }),
});

export type ZoneQuestCompleted = z.infer<typeof ZoneQuestCompletedSchema>;
