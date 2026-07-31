import { z } from 'zod';

export const ZoneQuestCompletedPayloadSchema = z.object({
  questId: z.number(),
  questTitle: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  objectives: z.array(z.object({
    objectiveTitle: z.string().nullable(),
    photoUrl: z.string().nullable(),
  })),
});

export const ZoneQuestCompletedSchema = z.object({
  resource: z.literal('zone_quest'),
  action: z.literal('completed'),
  createdAt: z.string(),
  payload: ZoneQuestCompletedPayloadSchema,
});

export type ZoneQuestCompletedPayload = z.infer<typeof ZoneQuestCompletedPayloadSchema>;
export type ZoneQuestCompletedEvent = z.infer<typeof ZoneQuestCompletedSchema>;
