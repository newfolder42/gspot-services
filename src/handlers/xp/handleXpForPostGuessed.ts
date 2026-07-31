import { increaseUserXp } from "../../lib/xp";
import { PostGuessedEvent } from "../../types/post-guessed";

export default async function handleXpForPostGuessed(event: PostGuessedEvent) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: event.payload.userId,
      action: payload.guessType ==  'gps-guess' ? 'post-guessed' : 'post-guessed-by-photo',
      details: { postId: payload.postId, score: payload.score }
    });
    await increaseUserXp({
      userId: event.payload.authorId,
      action: 'post-being-guessed',
      details: { postId: payload.postId, score: payload.score }
    });
  } catch (err) {
    console.error('Failed handleXpForPostGuessed', err, event);
  }
}
