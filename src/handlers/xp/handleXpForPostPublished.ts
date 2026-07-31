import { increaseUserXp } from "../../lib/xp";
import { PostPublishedEvent } from "../../types/post-published";

export default async function handleXpForPostPublished(event: PostPublishedEvent) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: event.payload.authorId,
      action: 'post-published',
      details: { postId: payload.postId }
    });
  } catch (err) {
    console.error('Failed handleXpForPostPublished', err, event);
  }
}
