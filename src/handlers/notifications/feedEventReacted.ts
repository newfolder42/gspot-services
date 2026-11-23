import { upsertGroupedNotification } from '../../lib/notifications';
import { FeedEventReactedEvent } from '../../types/feed-event-reacted';

export default async function handleFeedEventReacted(event: FeedEventReactedEvent) {
  const payload = event.payload;

  if (payload.reactorId === payload.ownerId) return;

  // every reaction to one story is one notification for its owner
  await upsertGroupedNotification({
    userId: payload.ownerId,
    type: 'feed-event-reaction',
    groupKey: `feed-reaction:${payload.eventId}`,
    actor: { userId: payload.reactorId, alias: payload.reactorAlias },
    details: {
      eventId: payload.eventId,
      eventType: payload.eventType,
      reaction: payload.reaction,
      reactorId: payload.reactorId,
      reactorAlias: payload.reactorAlias,
    },
  });
}
