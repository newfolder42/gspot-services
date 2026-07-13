import { z } from 'zod';

export const PostRewardCreatedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('reward-created'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    commentId: z.number().nullable().optional(),
    rewardKey: z.string(),
    rewardName: z.string(),
    giverId: z.number(),
    giverAlias: z.string(),
    postAuthorId: z.number(),
    postAuthorAlias: z.string(),
    commentAuthorId: z.number().nullable().optional(),
    commentAuthorAlias: z.string().nullable().optional(),
    zoneId: z.number(),
    zoneSlug: z.string(),
  }),
});

export type PostRewardCreatedEvent = z.infer<typeof PostRewardCreatedSchema>;
