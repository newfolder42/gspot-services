# GSpot Services (sample)

Short demo Node.js + TypeScript service that subscribes to a Redis channel and writes events to PostgreSQL.

## Tech choices ✅
- TypeScript (recommended): better type-safety, maintainability, and IDE support.
- Redis Pub/Sub for a simple queue subscription model.
- PostgreSQL for persistence.
- PM2 or systemd for process supervision on the Lightsail instance.
- GitHub Actions for CI/CD; deploy via SSH to the Lightsail instance.

## Quick start (local)
1. Copy `.env.example` to `.env` and fill your values.
2. Install deps: `npm ci`
3. Build: `npm run build`
4. Run local (for development): `npm run dev` (requires `ts-node-dev`)
5. Run migration to create the sample `events` table: `npm run migrate` (after build)

## Healthcheck
The service exposes a simple HTTP health endpoint at `/health` (default port `3001` or set via `PORT` env). The endpoint verifies both PostgreSQL and Redis connectivity and returns HTTP 200 with `{ "status": "ok" }` when healthy, or HTTP 500 with a reason if either check fails. Use this endpoint for simple monitoring or load balancer health checks.

## Deployment (Lightsail / Bitnami)
1. Ensure Node (>=18), npm, Redis and PostgreSQL are installed and reachable.
2. Create a deploy user and a directory (e.g. `/opt/gspot`), and set appropriate permissions.
3. Create systemd unit (`deploy/gspot.service`) or use PM2 with `ecosystem.config.js`.
4. Use the included GitHub Action (`.github/workflows/deploy.yml`) to deploy on push to `main`.

### GitHub Action Secrets
- `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `SSH_PORT` (optional), `REMOTE_DIR`.

## Redis behavior
The service subscribes to the channel defined in `REDIS_CHANNEL` (default `gspot:queue`). Publish JSON messages to that channel; incoming messages will be parsed and inserted into `events.payload` JSONB column.

## Why TypeScript?
- Strong typing prevents many bugs at compile time.
- Great tooling and refactors (VS Code).
- Easy incremental adoption: you can start with plain JS and migrate files to `.ts` as you go, but starting with TS is recommended.

## Notes for AWS Lightsail (Bitnami)
- Bitnami stacks may run services as `bitnami` user; adjust `deploy/gspot.service` and `REMOTE_DIR` accordingly.
- Keep Redis local to the instance (fast, simple), and expose only necessary ports.

## Next steps / improvements
- Add tests and a schema migration manager (e.g., node-pg-migrate).
- Use Redis Streams for reliable consumer groups and persist offsets.
- Add health monitoring, logging, and alerting integration.

