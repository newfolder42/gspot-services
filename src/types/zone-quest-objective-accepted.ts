import { z } from 'zod';

export const ZoneQuestObjectiveAcceptedPayloadSchema = z.object({
  objectiveId: z.number(),
  objectiveTitle: z.string().nullable(),
  questId: z.number(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  userId: z.number(),
});

export const ZoneQuestObjectiveAcceptedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('accepted'),
  createdAt: z.string(),
  payload: ZoneQuestObjectiveAcceptedPayloadSchema,
});

export type ZoneQuestObjectiveAcceptedPayload = z.infer<typeof ZoneQuestObjectiveAcceptedPayloadSchema>;
export type ZoneQuestObjectiveAcceptedEvent = z.infer<typeof ZoneQuestObjectiveAcceptedSchema>;
