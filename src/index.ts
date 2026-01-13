import cron from "node-cron";
import dotenv from 'dotenv';
import { dbclose } from './lib/db';
import { initializeRedis } from './lib/redis';
import { createHealthServer } from './lib/healthServer';
import { withSchema } from './lib/validation';
import { runUserCronJob } from './lib/cron';
import { PostGuessedSchema } from './types/post-guesed';
import { PostPublishedSchema } from './types/post-published';
import { Mediator } from './mediator';
import postCreatedHandler from './handlers/postPublished';
import postGuessedHandler from './handlers/postGuessed';
import { PostProcessingSchema } from "./types/post-processing";
import handlePostProcessing from "./handlers/postProcessing";
import { PostFailedSchema } from "./types/post-failed";
import handlePostFailed from "./handlers/postFailed";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = Number(process.env.PORT) || 3001;

async function start() {
  console.log('Starting gspot-services...');

  // Initialize connections
  const { redis, redisHealth, redisPublisher } = await initializeRedis(REDIS_URL);

  // Setup event mediator
  const mediator = new Mediator();
  mediator.register('gspot:post:published', withSchema(PostPublishedSchema, postCreatedHandler));
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, postGuessedHandler));
  mediator.register('gspot:post:processing', withSchema(PostProcessingSchema, handlePostProcessing));
  mediator.register('gspot:post:failed', withSchema(PostFailedSchema, handlePostFailed));

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

  // Schedule cron jobs
  //cron.schedule("* * * * *", runUserCronJob);

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