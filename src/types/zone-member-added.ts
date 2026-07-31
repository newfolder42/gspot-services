import { z } from 'zod';

export const ZoneMemberAddedPayloadSchema = z.object({
  invitedBy: z.number(),
  invitedByAlias: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  status: z.string(),
});

export const ZoneMemberAddedSchema = z.object({
  resource: z.literal('zone_member'),
  action: z.literal('added'),
  createdAt: z.string(),
  payload: ZoneMemberAddedPayloadSchema,
});

export type ZoneMemberAddedPayload = z.infer<typeof ZoneMemberAddedPayloadSchema>;
export type ZoneMemberAddedEvent = z.infer<typeof ZoneMemberAddedSchema>;
