import { increaseUserXp } from "../../lib/xp";
import { HideAndSeekFoundEvent } from "../../types/hide-and-seek";

/**
 * XP only ever lands on a successful hunt: the seeker who made the catch, and the host
 * once per seeker who found them. A game that expires with nobody finding pays nothing.
 */
export default async function handleXpForHideAndSeekFound(event: HideAndSeekFoundEvent) {
  const payload = event.payload;

  try {
    await increaseUserXp({
      userId: payload.userId,
      action: 'hide-and-seek-found',
      details: { gameId: payload.gameId, postId: payload.postId, checkCount: payload.checkCount },
    });
    await increaseUserXp({
      userId: payload.hostId,
      action: 'hide-and-seek-host-found',
      details: { gameId: payload.gameId, postId: payload.postId, seekerId: payload.userId },
    });
  } catch (err) {
    console.error('Failed handleXpForHideAndSeekFound', err, event);
  }
}
