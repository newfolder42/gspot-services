import { z } from 'zod';

export const PostGuessedPayloadSchema = z.object({
  postId: z.number(),
  guessType: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  userId: z.number(),
  userAlias: z.string(),
  score: z.number(),
  zoneId: z.number(),
  zoneSlug: z.string(),
});

export const PostGuessedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('guessed'),
  createdAt: z.string(),
  payload: PostGuessedPayloadSchema,
});

export type PostGuessedPayload = z.infer<typeof PostGuessedPayloadSchema>;
export type PostGuessedEvent = z.infer<typeof PostGuessedSchema>;
