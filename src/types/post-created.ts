import { z } from 'zod';

export const PostCreatedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('created'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    postType: z.string(),
    postTitle: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
  }),
});

export type PostCreated = z.infer<typeof PostCreatedSchema>;