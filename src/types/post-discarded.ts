import { z } from 'zod';

export const PostDiscardedPayloadSchema = z.object({
  postId: z.number(),
  postTitle: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  actorId: z.number(),
  actorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostDiscardedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('discarded'),
  createdAt: z.string(),
  payload: PostDiscardedPayloadSchema,
});

export type PostDiscardedPayload = z.infer<typeof PostDiscardedPayloadSchema>;
export type PostDiscardedEvent = z.infer<typeof PostDiscardedSchema>;
