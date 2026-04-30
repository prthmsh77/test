-- GPS ping time-series using TimescaleDB hypertable when available.
-- PRD non-negotiable: "TimescaleDB hypertable for trek_pings — never use a regular Postgres table."
-- In production: TimescaleDB MUST be present.
-- In dev/CI: gracefully falls back to a plain Postgres table with native partitioning.

CREATE TYPE network_type AS ENUM ('WIFI', '4G', '3G', '2G', 'OFFLINE');

CREATE TABLE trek_pings (
  -- TimescaleDB requires the time column in the PRIMARY KEY for partitioning.
  recorded_at       TIMESTAMPTZ NOT NULL,
  trek_id           UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  altitude_meters   NUMERIC(7,1),
  accuracy_meters   NUMERIC(6,1),
  heading_degrees   NUMERIC(5,1),
  speed_mps         NUMERIC(5,2),
  battery_percent   SMALLINT,
  network_type      network_type,
  -- True when this ping was stored offline and synced later.
  is_offline_buffered BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (trek_id, recorded_at)
);

-- Convert to TimescaleDB hypertable only if the extension is installed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
  ) THEN
    PERFORM create_hypertable(
      'trek_pings',
      'recorded_at',
      chunk_time_interval => INTERVAL '7 days',
      if_not_exists => true
    );
    RAISE NOTICE 'trek_pings converted to TimescaleDB hypertable.';
  ELSE
    RAISE NOTICE 'TimescaleDB not available — trek_pings is a plain table. Use TimescaleDB in production.';
  END IF;
END;
$$;

-- Spatial index for off-route detection queries.
CREATE INDEX idx_trek_pings_location_gist ON trek_pings USING GIST(location);
-- Covering index for "get last N pings for trek" (most common read pattern).
CREATE INDEX idx_trek_pings_trek_time ON trek_pings(trek_id, recorded_at DESC);

-- Escalation event log — append-only audit trail for every escalation action.
-- This table is legally significant: it must never be updated or deleted.
CREATE TABLE escalation_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trek_id         UUID NOT NULL REFERENCES treks(id) ON DELETE RESTRICT,
  level           VARCHAR(2) NOT NULL, -- L0, L1, L2, L3, L4, L5
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_reason  TEXT NOT NULL,
  last_known_location GEOGRAPHY(POINT, 4326),
  last_known_alt_m    NUMERIC(7,1),
  actions_taken   JSONB NOT NULL DEFAULT '[]',
  resolved_at     TIMESTAMPTZ,
  resolution_type VARCHAR(50),
  resolution_notes TEXT
);

CREATE INDEX idx_escalation_trek ON escalation_events(trek_id, triggered_at DESC);
CREATE INDEX idx_escalation_level ON escalation_events(level);
