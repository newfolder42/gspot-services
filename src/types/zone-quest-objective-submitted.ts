import { z } from 'zod';

export const ZoneQuestObjectiveSubmittedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('submitted'),
  createdAt: z.string(),
  payload: z.object({
    objectiveId: z.number(),
    objectiveTitle: z.string(),
    questId: z.number(),
    questTitle: z.string(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    userId: z.number(),
    userAlias: z.string(),
  }),
});

export type ZoneQuestObjectiveSubmitted = z.infer<typeof ZoneQuestObjectiveSubmittedSchema>;
