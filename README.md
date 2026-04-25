# gspot-services

Event-driven background service for the GSpot platform. Subscribes to Redis Pub/Sub channels, validates incoming events with Zod schemas, and fans them out to typed handlers that write notifications, XP changes, and achievements to PostgreSQL.

---

## Architecture overview

```
Redis (gspot:* channels)
        │
        ▼
   Mediator (channel → []Handler)
        │
        ├── Notifications  (createNotification → Postgres)
        ├── XP             (award / revoke XP → Postgres)
        ├── Achievements   (unlock checks → Postgres)
        └── Leaderboard    (update rankings → Postgres)

Cron jobs run alongside the subscriber loop:
  - Delete old notifications
  - Delete expired pending registrations
  - Email unseen notifications
```

All incoming messages are parsed with **Zod** before reaching a handler. Invalid payloads are logged and dropped — they never reach business logic.

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18, TypeScript 5 |
| Message bus | Redis 8 (Pub/Sub, pattern subscribe `gspot:*`) |
| Database | PostgreSQL (via `pg`) |
| Validation | Zod |
| Scheduling | node-cron |
| Process supervisor | systemd (`deploy/gspot.service`) or PM2 (`ecosystem.config.js`) |

---

## Relationship with gspot-web

[gspot-web](https://github.com/newfolder42/gspot-web) is the main Next.js application. It publishes events to Redis via `lib/eventBus.ts` whenever significant things happen (post published, guess submitted, comment created, etc.). This service (`gspot-services`) is the consumer — it subscribes to those channels and handles all side effects asynchronously, keeping them out of the web request lifecycle.

```
gspot-web  ──publish──▶  Redis (gspot:* channels)  ──subscribe──▶  gspot-services
```

Both services share the same PostgreSQL database and Redis instance. They do not communicate with each other directly.

---

## Redis channels and handlers

| Channel | Handlers |
|---|---|
| `gspot:post:published` | notification → post author, XP award, achievement checks |
| `gspot:post:guessed` | notification → guesser, leaderboard update, XP award, achievement checks |
| `gspot:post:processing` | post-processing side effects |
| `gspot:post:failed` | failure notification |
| `gspot:post:deleted` | XP revocation |
| `gspot:post:comment-created` | comment notification (author or parent commenter) |
| `gspot:user_connection:created` | connection notification, achievement checks |
| `gspot:user_achievement:achieved` | achievement unlocked notification |
| `gspot:user_profile_photo:changed` | profile photo achievement check |
| `gspot:user:level-up` | level-change achievement checks |
| `gspot:user:level-down` | level-change achievement checks |

A single channel can have multiple handlers. They run sequentially; a failure in one handler does not block the others.

### Comment notification logic

- **Base comment** (no parent): the post author is notified, unless they wrote the comment themselves.
- **Reply** (parent set): only the parent commenter is notified, unless they wrote this reply themselves.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3001` | Health server port |
| `SMTP_*` | — | SMTP credentials for the email job |

---

## Local development

```bash
# 1. Start Redis
docker compose up -d

# 2. Install dependencies
cd src
npm ci

# 3. Start with hot-reload
npm run dev
```

`npm run dev` uses `ts-node-dev` with `--respawn --transpile-only` — no build step needed.

---

## Production build

```bash
cd src
npm ci
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

---

## Health endpoint

```
GET /health   →   200 { "status": "ok" }
              →   500 { "status": "fail", "reason": "db" | "redis" }
```

Checks both PostgreSQL (`SELECT 1`) and Redis (`PING`) on every request. Use this for load balancer or uptime-monitor health checks.

---

## Deployment (AWS Lightsail / Bitnami)

### systemd

```bash
sudo cp deploy/gspot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gspot
```

The unit file expects the build output at `/home/bitnami/gspot/dist/` and reads env from `/home/bitnami/gspot/.env`.

### PM2

```bash
cd /home/bitnami/gspot
pm2 start src/ecosystem.config.js
pm2 save
```

### CI/CD (GitHub Actions)

The deploy workflow SSHs into the server, pulls the latest build, and restarts the service. Required secrets:

| Secret | Description |
|---|---|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USERNAME` | SSH user |
| `SSH_PRIVATE_KEY` | Private key for SSH auth |
| `SSH_PORT` | SSH port (optional, defaults to 22) |
| `REMOTE_DIR` | Absolute path to the app on the server |

---

## Project structure

```
src/
  index.ts                  # Entry point: wires Redis, Mediator, cron jobs, health server
  mediator.ts               # Channel-to-handler fan-out (Mediator pattern)
  handlers/
    notifications/          # Per-event notification creators
    xp/                     # XP award and revocation handlers
    achievements/           # Achievement unlock handlers
    handlePostGuessedLeaderboard.ts
    postProcessing.ts
  jobs/                     # Cron jobs (emails, cleanup)
  lib/                      # Shared utilities: db, redis, notifications, xp, achievements, email
  types/                    # Zod schemas + inferred TypeScript types per event
```

