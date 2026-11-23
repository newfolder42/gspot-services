import { PostGuessedEvent } from '../../types/post-guessed';
import { upsertGroupedNotification } from '../../lib/notifications';

/**
 * Everyone who guesses a post lands in one notification per guess kind, so a post that
 * three people tried reads "A, B and 1 other tried guessing" instead of three rows.
 */
export default async function handlePostGuessed(event: PostGuessedEvent) {
  const payload = event.payload;
  const guessType = payload.guessType;

  if (guessType !== 'gps-guess' && guessType !== 'gps-photo-guess') return;

  await upsertGroupedNotification({
    userId: payload.authorId,
    type: guessType,
    groupKey: `${guessType}:${payload.postId}`,
    actor: { userId: payload.userId, alias: payload.userAlias },
    details: {
      postId: payload.postId,
      userId: payload.userId,
      userAlias: payload.userAlias,
      score: payload.score,
    },
  });
}
