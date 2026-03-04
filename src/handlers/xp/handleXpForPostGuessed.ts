import { increaseUserXp } from "../../lib/xp";
import { PostGuessed } from "../../types/post-guesed";

export default async function handleXpForPostGuessed(event: PostGuessed) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: event.payload.userId,
      action: 'post-guessed',
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
