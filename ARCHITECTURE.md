# Shikhar — Architecture Decisions

## ADR-001: TimescaleDB hypertable for trek_pings (non-negotiable)
**Decision:** `trek_pings` is a TimescaleDB hypertable with 7-day chunks.
**Why:** Standard Postgres tables degrade on time-series writes at scale. With 250k WAU × 4 pings/min = 60M pings/day during peak season, we need chunk-based compression and efficient time-range pruning. TimescaleDB handles this natively.
**Consequence:** Migrations must `SELECT create_hypertable(...)` after table creation. ORM must not re-create the table without the hypertable call.

## ADR-002: GEOGRAPHY (not GEOMETRY) for spatial columns
**Decision:** All spatial columns use `GEOGRAPHY(LINESTRING/POINT, 4326)`.
**Why:** GEOMETRY coordinates are in a flat Cartesian plane — ST_Distance returns degrees, not metres. GEOGRAPHY operates on a sphere, so ST_Distance and ST_DWithin return metres directly. For off-route detection we compare metres against PRD's 150m threshold, so we need GEOGRAPHY.
**Consequence:** PostGIS GEOGRAPHY has fewer supported functions than GEOMETRY. If we need planar operations (e.g., polygon intersections for map tiles), we cast `::geometry` explicitly.

## ADR-003: Temporal.io for escalation workflows (not cron jobs)
**Decision:** The L0–L4 escalation ladder runs as a Temporal durable workflow, not a cron/setInterval.
**Why:** Escalation timers span 6+ hours. If the API server restarts mid-escalation, a cron-based approach loses state. Temporal persists workflow state to its own DB and resumes from the exact timer position after restarts. Idempotency is guaranteed at the workflow level.
**Consequence:** Phase 3 requires a running Temporal server. Added to docker-compose as Phase 3 dependency.

## ADR-004: SHA-256 hashing for OTPs and refresh tokens
**Decision:** OTPs and refresh tokens are stored as SHA-256 hashes, never in plaintext.
**Why:** If the DB is compromised, raw OTPs/tokens would allow full account takeover. SHA-256 is sufficient for short-lived secrets because OTPs expire in 10 min and refresh tokens rotate on use.
**Consequence:** The API layer computes the hash before any DB query. Comparison is done in the DB (WHERE otp_hash = SHA256($input)) — never a timing-unsafe string compare.

## ADR-005: Fastify adapter for NestJS (not Express)
**Decision:** NestJS uses the Fastify adapter.
**Why:** GPS ping ingestion needs to handle burst traffic (reconnect storms after coverage gaps). Fastify benchmarks 2–3× higher req/s than Express for JSON-heavy routes. This matters on ping ingestion where every active trekker sends a ping every 15 seconds.
**Consequence:** Express-specific middleware (e.g., cookie-parser, multer) must be replaced with Fastify equivalents.

## ADR-006: Separate Python ML service (not embedded in Node.js)
**Decision:** ML inference runs as a separate FastAPI service, not a Node.js worker thread.
**Why:** PyTorch and scikit-learn are Python-native. Running Python in Node.js worker threads via python-shell adds latency and complexity. The ML service scales independently (can be GPU-accelerated without affecting the API tier).
**Consequence:** API calls ML service over HTTP (internal Docker network). All ML endpoints must be idempotent (no side effects) since the API may retry on timeout.

## ADR-007: Live-track URL is a signed JWT, not a database-backed token
**Decision:** The live-track URL token is a JWT (signed with LIVE_TRACK_SECRET).
**Why:** The public web page needs to verify the token without hitting the DB on every WebSocket connection. JWT self-contained verification avoids a DB round-trip per connection, which matters when an incident generates many simultaneous family viewers.
**Consequence:** Token revocation (e.g., trek cancelled) must be handled by short expiry + a Redis blocklist, not DB deletion.

## ADR-008: PostGIS spatial indexes on all geography columns (non-negotiable)
**Decision:** Every GEOGRAPHY column has a GiST index.
**Why:** PostGIS without spatial indexes falls back to sequential scan. For off-route detection (checked on every incoming ping) a sequential scan of trek_pings is O(n) on millions of rows. GiST reduces this to O(log n) bounding-box intersection.
**Consequence:** Index creation must happen in the migration, not as an afterthought. `CREATE INDEX CONCURRENTLY` for future index additions on live tables.
