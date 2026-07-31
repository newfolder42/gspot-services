import { z } from 'zod';

export const ZoneQuestObjectiveSubmittedPayloadSchema = z.object({
  objectiveId: z.number(),
  objectiveTitle: z.string().nullable(),
  questId: z.number(),
  questTitle: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  userId: z.number(),
  userAlias: z.string(),
});

export const ZoneQuestObjectiveSubmittedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('submitted'),
  createdAt: z.string(),
  payload: ZoneQuestObjectiveSubmittedPayloadSchema,
});

export type ZoneQuestObjectiveSubmittedPayload = z.infer<typeof ZoneQuestObjectiveSubmittedPayloadSchema>;
export type ZoneQuestObjectiveSubmittedEvent = z.infer<typeof ZoneQuestObjectiveSubmittedSchema>;
