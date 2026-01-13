import http from 'http';
import { query } from './db';

export function createHealthServer(redisHealth: any) {
  return http.createServer(async (req, res) => {
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
}
