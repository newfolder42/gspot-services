import { z } from 'zod';

export const ZoneMemberAddedSchema = z.object({
  resource: z.literal('zone_member'),
  action: z.literal('added'),
  createdAt: z.string(),
  payload: z.object({
    invitedBy: z.number(),
    invitedByAlias: z.string(),
    userId: z.number(),
    userAlias: z.string(),
    zoneId: z.number(),
    zoneSlug: z.string(),
    status: z.string(),
  }),
});

export type ZoneMemberAdded = z.infer<typeof ZoneMemberAddedSchema>;
