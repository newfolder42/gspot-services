import { z } from 'zod';

export const FeedEventReactedPayloadSchema = z.object({
  eventId: z.number(),
  eventType: z.string(),
  reaction: z.literal('upvote'),
  reactorId: z.number(),
  reactorAlias: z.string(),
  ownerId: z.number(),
  ownerAlias: z.string(),
});

export const FeedEventReactedSchema = z.object({
  resource: z.literal('feed_event'),
  action: z.literal('reacted'),
  createdAt: z.string(),
  payload: FeedEventReactedPayloadSchema,
});

export type FeedEventReactedPayload = z.infer<typeof FeedEventReactedPayloadSchema>;
export type FeedEventReactedEvent = z.infer<typeof FeedEventReactedSchema>;
