import { z } from 'zod';

export const PostDeletedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('Deleted'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    postType: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
  }),
});

export type PostDeleted = z.infer<typeof PostDeletedSchema>;