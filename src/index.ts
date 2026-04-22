import cron from "node-cron";
import dotenv from 'dotenv';
import { dbclose } from './lib/db';
import { initializeRedis } from './lib/redis';
import { createHealthServer } from './lib/healthServer';
import { withSchema } from './lib/validation';
import { runEmailSenderForUnseenNotifications } from './jobs/emailSenderForUnseenNotifications';
import { runDeletePendingRegistrations } from './jobs/deletePendingRegistrations';
import { deleteOldNotifications } from './jobs/deleteOldNotifications';
import { PostGuessedSchema } from './types/post-guesed';
import { PostPublishedSchema } from './types/post-published';
import { Mediator } from './mediator';
import handlePostGuessedLeaderboard from './handlers/handlePostGuessedLeaderboard';
import postGuessedHandler from './handlers/notifications/postGuessed';
import { PostProcessingSchema } from "./types/post-processing";
import handlePostProcessing from "./handlers/postProcessing";
import { PostFailedSchema } from "./types/post-failed";
import handlePostFailed from "./handlers/notifications/postFailed";
import handleNewConnection from "./handlers/notifications/userConnectionCreated";
import { UserConnectionCreatedSchema } from "./types/user-connection-created";
import handlePostPublished from "./handlers/notifications/postPublished";
import handleXpForPostGuessed from "./handlers/xp/handleXpForPostGuessed";
import handleXpForPostPublished from "./handlers/xp/handleXpForPostPublished";
import { PostDeletedSchema } from "./types/post-deleted";
import handleXpForPostDeleted from "./handlers/xp/handleXpForPostDeleted";
import handleUserConnectionAchievements from "./handlers/achievements/handleUserConnectionAchievements";
import handleProfilePhotoAchievement from "./handlers/achievements/handleProfilePhotoAchievement";
import handlePostPublishedAchievements from "./handlers/achievements/handlePostPublishedAchievements";
import handlePostGuessedAchievements from "./handlers/achievements/handlePostGuessedAchievements";
import { UserProfilePhotoChangedSchema } from "./types/user-profile-photo-changed";
import { UserLevelChangedSchema } from "./types/user-level-changed";
import handleUserLevelChangedAchievements from "./handlers/achievements/handleUserLevelChangedAchievements";
import { UserAchievementAchievedSchema } from "./types/user-achievement-achieved";
import handleUserAchievementAchieved from "./handlers/notifications/userAchievementAchieved";
import { PostCommentCreatedSchema } from './types/post-comment-created';
import handlePostCommentCreated from './handlers/notifications/postCommentCreated';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = Number(process.env.PORT) || 3001;

async function start() {
  console.log('Starting gspot-services...');

  // Initialize connections
  const { redis, redisHealth, redisPublisher } = await initializeRedis(REDIS_URL);

  // Setup event mediator
  const mediator = new Mediator();
  mediator.register('gspot:post:published', withSchema(PostPublishedSchema, handlePostPublished));
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, handlePostGuessedLeaderboard));
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, postGuessedHandler));
  mediator.register('gspot:post:processing', withSchema(PostProcessingSchema, handlePostProcessing));
  mediator.register('gspot:post:failed', withSchema(PostFailedSchema, handlePostFailed));
  mediator.register('gspot:user_connection:created', withSchema(UserConnectionCreatedSchema, handleNewConnection));
  mediator.register('gspot:user_achievement:achieved', withSchema(UserAchievementAchievedSchema, handleUserAchievementAchieved));
  mediator.register('gspot:post:comment-created', withSchema(PostCommentCreatedSchema, handlePostCommentCreated));

  //xp handlers
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, handleXpForPostGuessed));
  mediator.register('gspot:post:published', withSchema(PostPublishedSchema, handleXpForPostPublished));
  mediator.register('gspot:post:deleted', withSchema(PostDeletedSchema, handleXpForPostDeleted));

  // achievement handlers
  mediator.register('gspot:user_connection:created', withSchema(UserConnectionCreatedSchema, handleUserConnectionAchievements));
  mediator.register('gspot:user_profile_photo:changed', withSchema(UserProfilePhotoChangedSchema, handleProfilePhotoAchievement));
  mediator.register('gspot:post:published', withSchema(PostPublishedSchema, handlePostPublishedAchievements));
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, handlePostGuessedAchievements));
  mediator.register('gspot:user:level-up', withSchema(UserLevelChangedSchema, handleUserLevelChangedAchievements));
  mediator.register('gspot:user:level-down', withSchema(UserLevelChangedSchema, handleUserLevelChangedAchievements));

  // Subscribe to Redis events
  await redis.pSubscribe('gspot:*', async (message, channel) => {
    console.log('Received message from Redis channel:', channel, message);
    try {
      await mediator.dispatch(channel, JSON.parse(message));
    } catch (err) {
      console.error('Processing error', err);
    }
  });

  // Start HTTP health server
  const server = createHealthServer(redisHealth);
  server.listen(PORT, () => {
    console.log(`Health endpoint listening on http://0.0.0.0:${PORT}/health`);
  });

  // Schedule cron jobs (every 5 minute between 10:00 and 22:59)
  cron.schedule("*/5 10-22 * * *", runEmailSenderForUnseenNotifications);

  // Schedule deletion of stale pending registrations (every minute)
  cron.schedule('* * * * *', runDeletePendingRegistrations);

  // Schedule deletion of old notifications (daily at midnight)
  cron.schedule('0 0 * * *', deleteOldNotifications);

  // Graceful shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  async function shutdown() {
    console.log('Shutting down...');
    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    } catch (e) {
      console.error('Error closing http server', e);
    }
    try {
      // unsubscribe then disconnect
      await redis.pUnsubscribe('gspot:*');
    } catch (e) {
      console.warn('Error unsubscribing', e);
    }
    try {
      await redis.disconnect();
    } catch (e) {
      console.error('Error disconnecting redis', e);
    }
    try {
      await redisHealth.disconnect();
    } catch (e) {
      console.error('Error disconnecting redis health client', e);
    }
    try {
      await dbclose();
    } catch (e) {
      console.error('Error disconnecting redis publisher client', e);
    }
    try {
      await redisPublisher.disconnect();
    }
    catch (e) {
      console.error('Error closing pool', e);
    }
    process.exit(0);
  }
}

start().catch((err) => {
  console.error('Fatal error on startup', err);
  process.exit(1);
});