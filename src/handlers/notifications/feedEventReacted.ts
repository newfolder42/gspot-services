import { createNotification } from '../../lib/notifications';
import { FeedEventReactedEvent } from '../../types/feed-event-reacted';

export default async function handleFeedEventReacted(event: FeedEventReactedEvent) {
  const payload = event.payload;

  if (payload.reactorId === payload.ownerId) return;

  await createNotification(payload.ownerId, 'feed-event-reaction', {
    eventId: payload.eventId,
    eventType: payload.eventType,
    reaction: payload.reaction,
    reactorId: payload.reactorId,
    reactorAlias: payload.reactorAlias,
  });
}
