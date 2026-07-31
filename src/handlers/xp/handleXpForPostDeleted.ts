import { increaseUserXp } from "../../lib/xp";
import { PostDeletedEvent } from "../../types/post-deleted";

export default async function handleXpForPostDeleted(event: PostDeletedEvent) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: event.payload.authorId,
      action: 'post-deleted',
      details: { postId: payload.postId }
    });
  } catch (err) {
    console.error('Failed handleXpForPostDeleted', err, event);
  }
}
