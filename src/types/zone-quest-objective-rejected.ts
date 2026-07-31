import { z } from 'zod';

export const ZoneQuestObjectiveRejectedPayloadSchema = z.object({
  objectiveId: z.number(),
  objectiveTitle: z.string().nullable(),
  questId: z.number(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  userId: z.number(),
  rejectionReason: z.string().nullable(),
});

export const ZoneQuestObjectiveRejectedSchema = z.object({
  resource: z.literal('zone_quest_objective'),
  action: z.literal('rejected'),
  createdAt: z.string(),
  payload: ZoneQuestObjectiveRejectedPayloadSchema,
});

export type ZoneQuestObjectiveRejectedPayload = z.infer<typeof ZoneQuestObjectiveRejectedPayloadSchema>;
export type ZoneQuestObjectiveRejectedEvent = z.infer<typeof ZoneQuestObjectiveRejectedSchema>;
