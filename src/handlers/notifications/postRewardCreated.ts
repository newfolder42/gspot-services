import { createNotification } from '../../lib/notifications';
import { PostRewardCreatedEvent } from '../../types/post-reward-created';

export default async function handlePostRewardCreated(event: PostRewardCreatedEvent) {
  const payload = event.payload;

  const details = {
    postId: payload.postId,
    commentId: payload.commentId ?? null,
    rewardKey: payload.rewardKey,
    rewardName: payload.rewardName,
    giverId: payload.giverId,
    giverAlias: payload.giverAlias,
  };

  if (payload.commentId === null || payload.commentId === undefined) {
    if (payload.giverId !== payload.postAuthorId) {
      await createNotification(payload.postAuthorId, 'post-reward-created', details);
    }
  } else {
    if (payload.commentAuthorId != null && payload.commentAuthorId !== payload.giverId) {
      await createNotification(payload.commentAuthorId, 'comment-reward-created', details);
    }
  }
}
