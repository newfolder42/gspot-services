import { createClient, RedisClientType } from 'redis';

let redisPublisher: RedisClientType;

export async function initializeRedis(REDIS_URL: string) {
  const redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('Redis error', err));
  await redis.connect();
  console.log('Connected to Redis (subscriber)');

  const redisHealth = createClient({ url: REDIS_URL });
  redisHealth.on('error', (err) => console.error('Redis health client error', err));
  await redisHealth.connect();

  redisPublisher = createClient({ url: REDIS_URL });
  redisPublisher.on('error', (err) => console.error('Redis publisher error', err));
  await redisPublisher.connect();
  console.log('Connected to Redis (publisher)');

  return { redis, redisHealth, redisPublisher };
}

export function getRedisPublisher() {
  return redisPublisher;
}

export async function publish<T>(resource: string, action: string, payload: T) {
  await redisPublisher!.publish(`gspot:${resource}:${action}`, JSON.stringify({
    resource,
    action,
    createdAt: new Date().toISOString(),
    payload
  }));
}