import { z } from 'zod';

export const PostLocationCorrectedGuessSchema = z.object({
  guessId: z.number(),
  userId: z.number(),
  guessType: z.string(),
  previousScore: z.number(),
  score: z.number(),
  guessedAt: z.string(),
});

export const PostLocationCorrectedPayloadSchema = z.object({
  postId: z.number(),
  postTitle: z.string(),
  authorId: z.number(),
  authorAlias: z.string(),
  zoneId: z.number(),
  zoneSlug: z.string(),
  guesses: z.array(PostLocationCorrectedGuessSchema),
});

export const PostLocationCorrectedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('location-corrected'),
  createdAt: z.string(),
  payload: PostLocationCorrectedPayloadSchema,
});

export type PostLocationCorrectedPayload = z.infer<typeof PostLocationCorrectedPayloadSchema>;
export type PostLocationCorrectedEvent = z.infer<typeof PostLocationCorrectedSchema>;
