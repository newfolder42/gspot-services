import dotenv from 'dotenv';
import { createClient } from 'redis';
import http from 'http';
import { dbclose, query } from './lib/db';
import { PostGuessedSchema } from './types/post-guesed';
import { PostCreatedSchema } from './types/post-created';
import { Mediator } from './mediator';
import postCreatedHandler from './handlers/postCreated';
import postGuessedHandler from './handlers/postGuessed';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = Number(process.env.PORT) || 3001;

async function start() {
  console.log('Subscriber client (dedicated for Pub/Sub)');
  const redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('Redis error', err));
  await redis.connect();
  console.log('Connected to Redis (subscriber)');

  // Health client (separate connection for ping/health checks)
  const redisHealth = createClient({ url: REDIS_URL });
  redisHealth.on('error', (err) => console.warn('Redis health client error', err));
  await redisHealth.connect();

  const mediator = new Mediator();

  const withSchema = (schema: any, handler: (evt: any) => Promise<void>) => {
    return async (raw: unknown) => {
      const result = schema.safeParse(raw);
      if (!result.success) {
        console.error('Invalid event payload', result.error.format());
        return;
      }
      await handler(result.data);
    };
  };

  mediator.register('gspot:post:created', withSchema(PostCreatedSchema, postCreatedHandler));
  mediator.register('gspot:post:guessed', withSchema(PostGuessedSchema, postGuessedHandler));

  await redis.pSubscribe('gspot:*', async (message, channel) => {
    console.log('Received message from Redis channel:', channel, message);
    try {
      await mediator.dispatch(channel, JSON.parse(message));
    } catch (err) {
      console.error('Processing error', err);
    }
  });

  // Simple HTTP health endpoint
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      // Check Postgres
      try {
        await query('SELECT 1');
      } catch (err) {
        console.error('DB health check failed', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'fail', reason: 'db' }));
        return;
      }

      // Check Redis
      try {
        const pong = await redisHealth.ping();
        if (!pong) throw new Error('No PONG');
      } catch (err) {
        console.error('Redis health check failed', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'fail', reason: 'redis' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {
    console.log(`Health endpoint listening on http://0.0.0.0:${PORT}/health`);
  });

  // Keep process alive and cleanup on shutdown
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
      console.error('Error closing pool', e);
    }
    process.exit(0);
  }
}

start().catch((err) => {
  console.error('Fatal error on startup', err);
  process.exit(1);
});