import { PostGuessed } from '../../types/post-guesed';
import { createNotification } from '../../lib/notifications';

export default async function handlePostGuessed(event: PostGuessed) {
  const payload = event.payload;
  const guessType = payload.guessType;


  if (guessType == 'gps-guess') {
    await createNotification(payload.authorId, guessType, {
      postId: payload.postId,
      userId: payload.userId,
      userAlias: payload.userAlias,
      score: payload.score,
    });
  }


  if (guessType == 'gps-photo-guess') {
    await createNotification(payload.authorId, guessType, {
      postId: payload.postId,
      userId: payload.userId,
      userAlias: payload.userAlias,
      score: payload.score,
    });
  }
}
