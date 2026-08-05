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
| Runtime | Node.js 20, TypeScript 6 |
| Message bus | Redis 8 server, `redis` v5 client (Pub/Sub, pattern subscribe `gspot:*`) |
| Database | PostgreSQL (via `pg` v8) |
| Validation | Zod v4 |
| Scheduling | node-cron |
| Process supervisor | systemd (`deploy/gspot.service`) |

Dependency versions are kept in lockstep with `gspot-web` so event contracts and shared libraries stay portable between the two.

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
| `gspot:post:comment-created` | comment notification (author or parent commenter), activity streak |
| `gspot:post:vote-created` | vote notification, activity streak (upvotes only) |
| `gspot:post:reward-created` | reward notification, activity streak |
| `gspot:user_connection:created` | connection notification, achievement checks |
| `gspot:user_achievement:achieved` | achievement unlocked notification, feed event, reward payout |
| `gspot:user_profile_photo:changed` | profile photo achievement check |
| `gspot:user:level-up` | level-change achievement checks |
| `gspot:user:level-down` | level-change achievement checks |
| `gspot:zone_member:added` | zone invitation notification |
| `gspot:zone_quest:created` | notification → active zone members, feed event |
| `gspot:zone_quest:completed` | notification → user and connections, feed event, reward payout, achievement checks |
| `gspot:zone_quest_objective:submitted` | notification → zone staff |
| `gspot:zone_quest_objective:accepted` | notification → submitter |
| `gspot:zone_quest_objective:rejected` | notification → submitter |

A single channel can have multiple handlers. They run sequentially; a failure in one handler does not block the others.

`gspot:zone_quest:accepted` is published by `gspot-web` but has no subscriber here.

### Event contracts

Each channel has one file in `src/types/` named after it, exporting a `…PayloadSchema` (the body), a `…Schema` (the full envelope), and the inferred `…Event` type. `gspot-web` mirrors these as interfaces in `src/types/events/` under identical filenames.

**The two sides are duplicated by hand and are not compile-checked against each other.** When you add or change a field, change both — a mismatch is not a crash, it is a silently dropped event. See [Finding dropped events](#finding-dropped-events).

### Comment notification logic

- **Base comment** (no parent): the post author is notified, unless they wrote the comment themselves.
- **Reply** (parent set): only the parent commenter is notified, unless they wrote this reply themselves.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | — | PostgreSQL host |
| `POSTGRES_DB` | — | Database name |
| `POSTGRES_USER` | — | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `POSTGRES_SSL` | `true` | Any value other than `false` enables SSL (`rejectUnauthorized: false`) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3001` | Health server port |
| `EMAIL_PROVIDER` | — | `ses` (Amazon SES) or `resend` |
| `EMAIL_PROVIDER_KEY` | — | API key, used when the provider is Resend |
| `AWS_REGION` | — | Region for SES, e.g. `eu-central-1` |
| `AWSSES_ACCESS_KEY_ID` | — | SES access key |
| `AWSSES_SECRET_ACCESS_KEY` | — | SES secret key |

In production this file is written by the deploy workflow from GitHub Secrets — see [CI/CD](#cicd-github-actions). The connection is assembled from discrete `POSTGRES_*` parts; there is no `DATABASE_URL`.

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

Deployments are supervised by systemd only. `src/ecosystem.config.js` is an unused PM2 leftover — `pm2 logs` will show nothing.

### CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` builds `src/` on the runner, uploads the artifact to S3, resolves the Lightsail instance IP by name, SCPs the build over, writes `/home/bitnami/gspot/.env` from GitHub Secrets, and restarts the systemd unit.

The SSH host and key are **not** secrets — the workflow looks up the instance IP with `aws lightsail get-instances` and downloads the key with `aws lightsail download-default-key-pair`. Only AWS credentials are needed:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | Deploy credentials (Lightsail + S3) |
| `AWS_SECRET_ACCESS_KEY` | Deploy credentials |
| `POSTGRES_HOST` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Written into the remote `.env` |
| `REDIS_URL` | Written into the remote `.env` |
| `EMAIL_PROVIDER_KEY` | Written into the remote `.env` |
| `AWSSES_ACCESS_KEY_ID` / `AWSSES_SECRET_ACCESS_KEY` | Written into the remote `.env` |

Non-secret values (`AWS_REGION`, `POSTGRES_SSL`, `EMAIL_PROVIDER`, `PORT`, `SSH_USER`, `DEPLOYMENT_DIR`, bucket names) are set in the workflow's `env:` block.

Every one of these secrets also exists in `gspot-web` with the same name and value — rotate them in both repos together.

---

## Logs and troubleshooting

The systemd unit sets no `StandardOutput`, so everything the service writes to stdout/stderr goes to the **journal**. There is no log file on disk, and this service does not ship to CloudWatch (only `gspot-web` does).

The unit is named **`gspot`** — not `gspot-services`, which is the Lightsail *instance* name.

```bash
# Live tail
sudo journalctl -u gspot -f

# Last 200 lines
sudo journalctl -u gspot -n 200 --no-pager

# A time window
sudo journalctl -u gspot --since "1 hour ago" --no-pager

# Errors only
sudo journalctl -u gspot -p err --since today --no-pager
```

Is it actually up:

```bash
sudo systemctl status gspot
curl -s localhost:3001/health
```

### Finding dropped events

`withSchema` logs and returns when a payload fails its Zod schema — the event is discarded with no throw, no retry and no alert. A handler that "never runs" is almost always this. Count them first:

```bash
sudo journalctl -u gspot --since "24 hours ago" --no-pager | grep -c "Invalid event payload"
```

Then read the field-level reasons:

```bash
sudo journalctl -u gspot --since "24 hours ago" --no-pager | grep -A 15 "Invalid event payload" | head -60
```

A non-zero count means a publisher in `gspot-web` and a schema in `src/types/` have drifted. Fix the contract on both sides — see [Redis channels and handlers](#redis-channels-and-handlers).

Every received message is logged before dispatch, so you can confirm a channel is flowing at all:

```bash
sudo journalctl -u gspot -f | grep "Received message from Redis channel"
```

### Persistent journal

Bitnami images often ship with a volatile journal — logs live in RAM and are lost on reboot. Check:

```bash
sudo journalctl -u gspot --disk-usage
```

If that reports nothing, enable persistence:

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

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
    rewards/                # Typed reward payouts (user-xp, catalog unlocks)
    feed/                   # Feed event ("ამბები") writers
    streaks/                # Daily activity streak tracking
    handlePostGuessedLeaderboard.ts
    postProcessing.ts
  jobs/                     # Cron jobs (emails, cleanup)
  lib/                      # Shared utilities: db, redis, notifications, xp, achievements, email
  types/                    # Zod schemas + inferred TypeScript types per event

deploy/gspot.service        # systemd unit, installed by CI (repo root)
```

