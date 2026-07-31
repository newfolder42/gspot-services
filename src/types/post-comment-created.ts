import { z } from 'zod';

export const PostCommentCreatedPayloadSchema = z.object({
  postId: z.number(),
  commentId: z.number(),
  parent: z.object({
    id: z.number(),
    commenterId: z.number(),
    commenterAlias: z.string()
  }).nullable().optional(),
  commentType: z.enum(['comment', 'gps-guess-comment', 'gps-photo-guess-comment']),
  commentBody: z.string(),
  postAuthorId: z.number(),
  postAuthorAlias: z.string(),
  commenterId: z.number(),
  commenterAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostCommentCreatedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('comment-created'),
  createdAt: z.string(),
  payload: PostCommentCreatedPayloadSchema,
});

export type PostCommentCreatedPayload = z.infer<typeof PostCommentCreatedPayloadSchema>;
export type PostCommentCreatedEvent = z.infer<typeof PostCommentCreatedSchema>;
