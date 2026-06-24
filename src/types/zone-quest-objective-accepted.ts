import { z } from 'zod';

export const ZoneQuestObjectiveAcceptedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('accepted'),
  createdAt: z.string(),
  payload: z.object({
    objectiveId: z.number(),
    objectiveTitle: z.string(),
    questId: z.number(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    userId: z.number(),
  }),
});

export type ZoneQuestObjectiveAccepted = z.infer<typeof ZoneQuestObjectiveAcceptedSchema>;
