import { z } from 'zod';

export const ZoneQuestObjectiveRejectedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('rejected'),
  createdAt: z.string(),
  payload: z.object({
    objectiveId: z.number(),
    objectiveTitle: z.string(),
    questId: z.number(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    userId: z.number(),
    rejectionReason: z.string(),
  }),
});

export type ZoneQuestObjectiveRejected = z.infer<typeof ZoneQuestObjectiveRejectedSchema>;
