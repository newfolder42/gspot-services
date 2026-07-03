import { z } from 'zod';

export const ZoneQuestCreatedSchema = z.object({
  resource: z.literal('zone_quest'),
  action: z.literal('created'),
  createdAt: z.string(),
  payload: z.object({
    questId: z.number(),
    questTitle: z.string(),
    description: z.string().nullable(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    character: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      avatarUrl: z.string().nullable(),
    }).nullable(),
    requiredLevel: z.number().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    createdBy: z.number(),
    createdByAlias: z.string(),
  }),
});

export type ZoneQuestCreated = z.infer<typeof ZoneQuestCreatedSchema>;
