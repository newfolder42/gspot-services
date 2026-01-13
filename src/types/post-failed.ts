import { z } from 'zod';

export const PostFailedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('failed'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    postType: z.string(),
    postTitle: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
    reason: z.string(),
  }),
});

export type PostFailed = z.infer<typeof PostFailedSchema>;