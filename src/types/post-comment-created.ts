import { z } from 'zod';

export const PostCommentCreatedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('comment-created'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    commentId: z.number(),
    parentId: z.number().nullable().optional(),
    postAuthorId: z.number(),
    postAuthorAlias: z.string(),
    commenterId: z.number(),
    commenterAlias: z.string(),
    commentType: z.string(),
    zoneId: z.number(),
    zoneSlug: z.string(),
  }),
});

export type PostCommentCreatedEvent = z.infer<typeof PostCommentCreatedSchema>;