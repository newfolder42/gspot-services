import { z } from 'zod';

export const PostProcessingPayloadSchema = z.object({
  postId: z.number(),
  postType: z.string(),
  postTitle: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostProcessingSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('processing'),
  createdAt: z.string(),
  payload: PostProcessingPayloadSchema,
});

export type PostProcessingPayload = z.infer<typeof PostProcessingPayloadSchema>;
export type PostProcessingEvent = z.infer<typeof PostProcessingSchema>;
