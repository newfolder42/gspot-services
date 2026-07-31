import { z } from 'zod';

export const PostDeletedPayloadSchema = z.object({
  postId: z.number(),
  postType: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostDeletedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('deleted'),
  createdAt: z.string(),
  payload: PostDeletedPayloadSchema,
});

export type PostDeletedPayload = z.infer<typeof PostDeletedPayloadSchema>;
export type PostDeletedEvent = z.infer<typeof PostDeletedSchema>;
