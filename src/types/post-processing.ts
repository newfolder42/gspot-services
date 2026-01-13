import { z } from 'zod';

export const PostProcessingSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('processing'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    postType: z.string(),
    postTitle: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
  }),
});

export type PostProcessing = z.infer<typeof PostProcessingSchema>;