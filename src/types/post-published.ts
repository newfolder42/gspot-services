import { z } from 'zod';

export const PostPublishedPayloadSchema = z.object({
  postId: z.number(),
  postType: z.string(),
  postTitle: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostPublishedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('published'),
  createdAt: z.string(),
  payload: PostPublishedPayloadSchema,
});

export type PostPublishedPayload = z.infer<typeof PostPublishedPayloadSchema>;
export type PostPublishedEvent = z.infer<typeof PostPublishedSchema>;
