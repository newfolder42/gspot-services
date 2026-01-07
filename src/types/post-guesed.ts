import { z } from 'zod';

export const PostGuessedSchema = z.object({
  resource: z.literal('post'),
  action: z.literal('guessed'),
  createdAt: z.string(),
  payload: z.object({
    postId: z.number(),
    guessType: z.string(),
    authorId: z.number(),
    authorAlias: z.string(),
    userId: z.number(),
    userAlias: z.string(),
    score: z.number(),
  }),
});

export type PostGuessed = z.infer<typeof PostGuessedSchema>;
