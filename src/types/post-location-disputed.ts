import { z } from 'zod';

export const PostLocationDisputedPayloadSchema = z.object({
  postId: z.number(),
  postTitle: z.string(),
  disputeId: z.number(),
  authorId: z.number(),
  authorAlias: z.string(),
  reporterId: z.number(),
  reporterAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  openCount: z.number(),
  firstOpen: z.boolean(),
  // optional so an event from a web build that predates them still parses
  reason: z.string().optional(),
  note: z.string().nullish(),
});

export const PostLocationDisputedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('location-disputed'),
  createdAt: z.string(),
  payload: PostLocationDisputedPayloadSchema,
});

export type PostLocationDisputedPayload = z.infer<typeof PostLocationDisputedPayloadSchema>;
export type PostLocationDisputedEvent = z.infer<typeof PostLocationDisputedSchema>;
