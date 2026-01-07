import { PostGuessed } from '../types/post-guesed';
import { createNotification } from '../lib/notifications';

export default async function handlePostGuessed(event: PostGuessed) {
  const payload = event.payload;

  await createNotification(payload.authorId, 'gps-guess', {
    postId: payload.postId,
    userId: payload.userId,
    userAlias: payload.userAlias,
    score: payload.score,
  });
}
