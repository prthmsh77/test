# Shikhar — Build Progress

## Phase 1: Foundation — COMPLETE ✅

**1.1** PRD read and understood (5 critical decisions confirmed).

**1.2 Monorepo (Turborepo)**
- `/apps/api` — NestJS + Fastify + TypeScript
- `/apps/ml` — FastAPI + Python 3.11
- `/apps/web` — Next.js 14 (live-track public page)
- `/apps/mobile` — React Native / Expo (scaffold + PingService)
- `/packages/shared` — shared TypeScript types, escalation/ping constants
- `/packages/database` — migrations, seed scripts, connection pool

**1.3 Docker Compose**
- PostgreSQL 16 + PostGIS + TimescaleDB (`timescale/timescaledb-ha:pg16`)
- Redis 7, NATS 2.10 (JetStream), Temporal.io
- Single `docker compose up -d` boots the full stack.
- TimescaleDB gracefully degrades to plain Postgres when not available (dev/CI).

**1.4 Database Migrations (9 migrations, all applied)**
- `001` extensions (PostGIS, TimescaleDB conditional, uuid-ossp, pg_trgm)
- `002` users, refresh_tokens, otp_requests
- `003` emergency_contacts (confirmation flow, phone uniqueness)
- `004` trails (GEOGRAPHY LineString, GiST indexes, waypoints)
- `005` treks (state machine, Temporal workflow ID, duress flag, ERSS-112 consent)
- `006` trek_pings (TimescaleDB hypertable 7-day chunks, escalation_events audit log)
- `007` social (posts, comments, kudos, follows/buddy tier, groups)
- `008` notifications (log + per-channel preferences)
- `009` user_pins (trek 2FA PIN + duress PIN, SHA-256 hashed)

**1.5 Seed data** — 5 MVP trails verified in DB:
Triund, Kedarkantha, Hampta Pass, Rajmachi, Kalsubai.

---

## Phase 2: Auth & User — COMPLETE ✅

- OTP service (MSG91, dev console fallback, 3-attempt brute-force guard)
- JWT + refresh token rotation (SHA-256 hashed, 30-day expiry)
- JwtStrategy validates user is active on every request
- RolesGuard wired globally via `APP_GUARD`
- Emergency contacts CRUD (free: 5, Pro: 10), confirmation token flow
- `users/me`, `users/me/emergency-contacts` CRUD endpoints

---

## Phase 3: Trek Check-In / Check-Out — COMPLETE ✅

### 3.1–3.2 Trek creation + state machine
- `POST /api/v1/treks` — creates a PLANNED trek, validates future dates, links E-Contacts
- State machine: `PLANNED → ACTIVE → COMPLETED | OVERDUE → INCIDENT | CANCELLED`

### 3.3 Trek Start
- `POST /api/v1/treks/:id/start`
- Generates JWT-signed live-track token (8-day expiry)
- Fires SMS to all E-Contacts via MSG91 (dev: console log)
- Starts Temporal escalation workflow (idempotent on trek ID)

### 3.4 GPS Ping Ingestion
- `POST /api/v1/pings/batch` — up to 100 pings per batch
- Idempotent: `INSERT ... ON CONFLICT DO NOTHING` on (trek_id, recorded_at)
- Validates trek ownership and ACTIVE status
- Triggers off-route check and altitude threshold detection per ping
- `GET /api/v1/pings/:trekId/recent` — for live-track web view

### 3.5 Trek End / Check-out
- `POST /api/v1/treks/:id/end` — 2FA PIN verification (SHA-256 comparison)
- Signals Temporal workflow `trekEnded` to cancel all pending timers

### 3.6 Temporal Escalation Workflow (L0→L5)
- `apps/api/src/modules/treks/workflows/escalation.workflow.ts`
- Durable: survives server restarts via Temporal state persistence
- Signal handlers: `trekEnded`, `extendTime`, `sosTrigger`
- L0 (0 min) → L1 (30 min) → L2 (2h) → L3 (4h) → L4 (6h) → L5 (continuous)
- Activities: SMS (MSG91), WhatsApp (Gupshup), voice (Exotel), ERSS-112 dispatch
- Dev mode: all activities log to console when API keys unset

### 3.7 Off-Route Detection
- `TreksService.checkOffRoute()` — PostGIS `ST_Distance(declared_route, current_point)`
- Threshold: 150m (PRD §7.3 non-negotiable)
- Returns boolean; controller/workflow triggers "Are you OK?" push

### 3.8 Altitude Threshold Alerts
- `TreksService.getAltitudeAlert()` — detects crossing 2400m, 3500m, 4500m
- Called on every ping ingest; alert returned in batch response for immediate push

### 3.9 SOS Endpoint
- `POST /api/v1/treks/:id/sos` — 3 modes: HELP, MEDICAL, CRITICAL
- CRITICAL: immediately signals workflow to L4 + sets trek to INCIDENT
- MEDICAL: signals L3 Sentinel dispatch
- HELP: E-Contact notification only
- Rate limit: 30/min (vs global 100/min — safety-critical)

### 3.10 Coercion/Duress Silent PIN
- On check-out: if entered PIN matches `duress_pin_hash`, appears to succeed
- Internally: marks `is_duress=true`, signals workflow `sosTrigger` (CRITICAL)
- Designed for women's safety scenarios (PRD §7.6)

---

## Tests — ALL PASSING ✅

| Package | Tests | Passing |
|---|---|---|
| `@shikhar/shared` | 6 | 6 ✅ |
| `@shikhar/api` | 33 | 33 ✅ |
| `apps/ml` (Python) | 14 | 14 ✅ |
| **Total** | **53** | **53** ✅ |

---

## Phase 3.5: Mobile App Frontend — COMPLETE ✅

### 3.5.1 Auth Flow (MSG91 OTP — Live)
- Welcome screen with gradient hero + "Get Started" CTA
- Login screen: phone input (+91 prefix), calls MSG91 `sendOtp` widget API
- OTP screen: 6-digit verification, calls MSG91 `verifyOtp` widget API
- Auth state managed via Zustand (`useAuthStore`)
- Dev mode fallback: bypasses MSG91 if API is blocked/unreachable

### 3.5.2 Navigation & App Shell
- Root `_layout.tsx` — Stack navigator with modal transitions for trek screens
- `(tabs)/_layout.tsx` — Bottom tab navigator (Feed, Map, Profile)
- Dark-mode design system throughout (black backgrounds, white text, accent colors)

### 3.5.3 Feed / Trail Explorer
- Lists all 5 MVP seed trails (Triund, Kedarkantha, Hampta Pass, Rajmachi, Kalsubai)
- Trail cards show difficulty badge, region, altitude, distance
- Taps navigate to trek creation screen
- Active trek banner shows at top when a trek is in progress

### 3.5.4 Live Map Screen
- `react-native-maps` with dark map style (Google Maps)
- `expo-location` for foreground GPS tracking (5s interval, 5m distance filter)
- Real-time polyline rendering of trek path from location history
- Bottom panel shows altitude, accuracy, ping count
- Center-on-user button
- SOS button when trek is active

### 3.5.5 Trek Management
- **Create Trek** (`/trek/create`): trail detail view, stats grid, safety features list, "Start Trek" button
- **Active Trek** (`/trek/active`): live dashboard with GPS pings, altitude, accuracy, safety status indicators
- **End Trek**: confirmation dialog (2FA PIN placeholder for production)
- State machine: Zustand `useTrekStore` mirrors backend PLANNED → ACTIVE → COMPLETED

### 3.5.6 SOS Screen
- 3-tier emergency system matching PRD §7.5:
  - **HELP** — E-Contact notification only
  - **MEDICAL** — Sentinel dispatch mobilized
  - **CRITICAL** — Immediate L4 escalation + ERSS-112 dispatch
- Confirmation dialogs prevent accidental triggers

### 3.5.7 Profile Screen
- User stats (treks, GPS pings, followers)
- Menu items: Emergency Contacts, Trek PIN / Duress PIN, Notification Prefs, Safety Settings
- Active trek banner with link to dashboard
- Logout clears auth state and returns to welcome screen

---

## Phase 4: WikiGIS & Real-time Monorepo Restructuring

- [x] 4.0 Created `packages/gis` (TypeScript module with Turf.js) for abstracting GeoJSON schema-aware diffing and Bounding Box caching.
- [x] 4.1 Created Migration `010_wikigis.sql` for WikiGIS `trail_edits` version control, UserRank, and TrailRank.
- [x] 4.1.5 Expanded `apps/ml` Exertion limits using Hypotenuse Velocity ($V_H$) math to `/exertion` and `/classify` endpoint logic.
- [ ] 4.2 WebSocket gateway (NestJS socket.io) — live ping fan-out to E-Contacts
- [ ] 4.3 Redis Streams consumer for ping events

## Phase 5: Terrain & External Systems Integration

- [x] 5.0 Implemented Token-based GeoJSON diffing in `packages/gis/src/diffing.ts`.
- [x] 5.1 Built Backend WikiGIS routes in `apps/api` (`proposeEdit`, `mergeEdit`) resolving crowdsourced edits and updating UserRank.
- [ ] 5.2 Implement PMTiles offline maps for mobile (Terrain-RGB rendering)
- [ ] 5.3 Integrate MMRCC into Temporal escalation workflow

- [ ] 5.1 Wire login screen → `POST /api/v1/auth/otp/request` + `POST /api/v1/auth/otp/verify`
- [ ] 5.2 Wire trek creation → `POST /api/v1/treks`
- [ ] 5.3 Wire trek start → `POST /api/v1/treks/:id/start`
- [ ] 5.4 Wire GPS pings → `POST /api/v1/pings/batch` (from PingService)
- [ ] 5.5 Wire trek end → `POST /api/v1/treks/:id/end` (with 2FA PIN)
- [ ] 5.6 Wire SOS → `POST /api/v1/treks/:id/sos`
- [ ] 5.7 WebSocket connection for live-track updates
- [ ] 5.8 Emergency contacts CRUD from mobile

---

## Blockers

None. Phase 3.5 (Mobile Frontend) complete. Ready for Phase 4/5.

---

See `ARCHITECTURE.md` for all design decisions.
