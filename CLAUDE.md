# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Shikhar — India's Trekking Social + Safety Platform. Turborepo + npm workspaces. Node `>=20`, npm `>=10`.

See `ARCHITECTURE.md` for full ADRs and `PROGRESS.md` for phase status. `PLAN.md` and the PRD drive feature decisions.

## Workspace layout

- `apps/api` — NestJS 10 + **Fastify** adapter (not Express). REST + WebSockets + Temporal worker. Global prefix `/api/v1`, Swagger at `/api/docs` in non-prod.
- `apps/ml` — FastAPI / Python 3.11 inference service (port 8000). Routers: `difficulty`, `anomaly`, `ams`, `weather`, `moderation`. Hypotenuse-Velocity (`V_H`) exertion math lives here.
- `apps/web` — Next.js 14 App Router public live-track page (port 3001). Mapbox GL + socket.io-client.
- `apps/mobile` — Expo / React Native (`expo-router`). Zustand stores (`useAuthStore`, `useTrekStore`). MSG91 OTP widget + foreground GPS via `expo-location`.
- `packages/shared` — TS types and constants (`escalation`, `ping`). Imported by every app.
- `packages/database` — Migrations (`001`–`010`), seed scripts, raw `pg` pool. Apps query via this pool, not an ORM.
- `packages/gis` — Turf.js helpers, bounding-box caching, schema-aware GeoJSON token diffing for WikiGIS. Both `apps/api` and `apps/mobile` consume it; do not duplicate spatial logic in either.

## Commands

Run from repo root unless stated. Turbo handles dependency ordering between workspaces.

```bash
# Stack
npm run docker:up        # Postgres+PostGIS, Redis, NATS, Temporal, api, ml, web
npm run docker:down

# Dev
npm run dev              # turbo run dev across all apps
npm run build
npm run lint
npm run test             # all workspaces

# Database
npm run db:migrate       # @shikhar/database — runs migrations/*.sql in order
npm run db:seed          # depends on db:migrate; loads 5 MVP trails
```

Per-workspace dev (when you only want one):

```bash
npm run dev --workspace=@shikhar/api      # nest start --watch (port 3000)
npm run dev --workspace=@shikhar/web      # next dev -p 3001
npm run start --workspace=@shikhar/mobile # expo start
# ML:
cd apps/ml && uvicorn src.main:app --reload --port 8000
```

Single test runs:

```bash
# API (Jest)
cd apps/api && npx jest path/to/file.spec.ts
cd apps/api && npx jest -t "describes off-route"
cd apps/api && npx jest --config jest-e2e.json   # e2e

# ML (pytest)
cd apps/ml && pytest tests/test_difficulty.py -k "name"
```

## Architectural non-negotiables

These are codified in `ARCHITECTURE.md`. Violating any of them breaks load assumptions or safety guarantees.

- **`trek_pings` is a TimescaleDB hypertable** (7-day chunks). Migrations must call `SELECT create_hypertable(...)` after table creation. The migration runner gracefully falls back to plain Postgres when the extension is absent (dev/CI), so do not branch app logic on it.
- **Spatial columns are `GEOGRAPHY(... , 4326)`, not `GEOMETRY`.** `ST_Distance`/`ST_DWithin` return metres directly — required for the 150 m off-route threshold. Cast `::geometry` only when a planar op is genuinely needed.
- **Every `GEOGRAPHY` column has a GiST index.** Add it inside the migration; future additions on live tables use `CREATE INDEX CONCURRENTLY`.
- **Escalation runs in Temporal, never cron / `setInterval`.** L0→L5 timers span 6+ hours and must survive API restarts. Workflow lives at `apps/api/src/modules/treks/workflows/escalation.workflow.ts`; signals: `trekEnded`, `extendTime`, `sosTrigger`. Activities (SMS/WhatsApp/voice/ERSS-112) are in `…/activities/escalation.activities.ts` and log to console when API keys are unset.
- **OTPs and refresh tokens are stored as SHA-256 hashes.** Compare in SQL (`WHERE otp_hash = SHA256($1)`) — never a JS string compare. Refresh tokens rotate on use.
- **NestJS uses the Fastify adapter** (`@nestjs/platform-fastify`). Do not introduce Express-only middleware (cookie-parser, multer, etc.) — use the Fastify equivalents.
- **ML calls go over HTTP to `apps/ml`.** All ML endpoints must be idempotent; the API may retry on timeout. Do not embed Python via worker threads.
- **Live-track URL is a signed JWT** (`LIVE_TRACK_SECRET`). Revocation = short expiry + Redis blocklist, not DB deletion.
- **WikiGIS edits go through `trail_edits` (PENDING → APPROVED).** Never `UPDATE trails.route_geography` directly. `mergeEdit` runs in a transaction with token-diffing; conflicts roll back. Approval bumps contributor `UserRank` by `+0.10`.
- **Spatial diffing / bbox caching lives only in `packages/gis`.** If `apps/api` or `apps/mobile` needs it, import — don't reimplement.
- **Exertion = Hypotenuse Velocity (`V_H`).** Both `/classify` and `/exertion` accept timestamped GPX and use `numpy`. Plain distance/gain heuristics are wrong for Sahyadri-style varying terrain.

## Cross-cutting domain rules

- **Trek state machine:** `PLANNED → ACTIVE → COMPLETED | OVERDUE → INCIDENT | CANCELLED`. Mirror this on the mobile side (`useTrekStore`).
- **Ping ingestion:** `POST /api/v1/pings/batch` accepts ≤100 pings; idempotency via `INSERT … ON CONFLICT DO NOTHING` on `(trek_id, recorded_at)`. Each ingest triggers off-route + altitude-threshold checks.
- **Off-route threshold = 150 m** (PRD §7.3). Computed via `ST_Distance(declared_route, point)`.
- **Altitude alerts at 2400 m / 3500 m / 4500 m** — returned in the batch response so the client can push immediately.
- **SOS modes:** `HELP` (E-Contact only), `MEDICAL` (signals L3 Sentinel), `CRITICAL` (jumps to L4 + sets trek `INCIDENT`). Rate-limited at 30/min vs global 100/min.
- **Duress PIN** (PRD §7.6): on check-out, if entered PIN equals `duress_pin_hash`, the response *appears* to succeed; internally `is_duress=true` and the workflow gets `sosTrigger` CRITICAL. Do not leak any signal of the duress branch through error codes, latency, or logs.
- **Plan tiers:** free user gets 5 emergency contacts, Pro gets 10. Confirmation flow + phone uniqueness enforced.
- **Dev fallbacks:** MSG91, Gupshup, Exotel, FCM all log to console when their keys are unset — keep this behavior when adding new external integrations so the stack boots without secrets.

## Env

`.env` is consumed by docker-compose via `env_file`. `.env.example` is the source of truth for variable names. CORS origins default to `http://localhost:3001,http://localhost:19006` (web + Expo). When containers talk to each other, override hosts (e.g. `POSTGRES_HOST=postgres`, `REDIS_URL=redis://redis:6379`, `TEMPORAL_ADDRESS=temporal:7233`) — already wired in `docker-compose.yml`.
