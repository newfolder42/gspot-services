import { z } from 'zod';

export const PostPublishedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('published'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    postType: z.string(),
    postTitle: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
  }),
});

export type PostPublished = z.infer<typeof PostPublishedSchema>;