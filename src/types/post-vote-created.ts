import { z } from 'zod';

export const PostVoteCreatedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('vote-created'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    commentId: z.number().nullable().optional(),
    value: z.union([z.literal(1), z.literal(-1)]),
    voterId: z.number(),
    voterAlias: z.string(),
    postAuthorId: z.number(),
    postAuthorAlias: z.string(),
    commentAuthorId: z.number().nullable().optional(),
    commentAuthorAlias: z.string().nullable().optional(),
    zoneId: z.number(),
    zoneSlug: z.string(),
  }),
});

export type PostVoteCreatedEvent = z.infer<typeof PostVoteCreatedSchema>;
