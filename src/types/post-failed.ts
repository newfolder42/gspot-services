import { z } from 'zod';

export const PostFailedPayloadSchema = z.object({
  postId: z.number(),
  postType: z.string(),
  postTitle: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  // Publishers derive `failed` from the post status and have no reason to attach.
  reason: z.string().nullable().optional(),
});

export const PostFailedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('failed'),
  createdAt: z.string(),
  payload: PostFailedPayloadSchema,
});

export type PostFailedPayload = z.infer<typeof PostFailedPayloadSchema>;
export type PostFailedEvent = z.infer<typeof PostFailedSchema>;
