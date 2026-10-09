import { z } from 'zod';

export const PostSuspendedPayloadSchema = z.object({
  postId: z.number(),
  postTitle: z.string(),
  suspensionId: z.number(),
  authorId: z.number(),
  authorAlias: z.string(),
  actorId: z.number(),
  actorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  note: z.string().nullish(),
});

export const PostSuspendedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('suspended'),
  createdAt: z.string(),
  payload: PostSuspendedPayloadSchema,
});

export type PostSuspendedPayload = z.infer<typeof PostSuspendedPayloadSchema>;
export type PostSuspendedEvent = z.infer<typeof PostSuspendedSchema>;
