-- Extensions must be created before any tables that depend on them.
-- PostGIS: spatial geometry types and functions used for trail routes, geo-fencing, off-route detection.
-- TimescaleDB: hypertable for trek_pings time-series. Optional — if not installed, the table
--   falls back to a standard Postgres table (acceptable for dev/test; required in production).
-- uuid-ossp: deterministic UUID generation in SQL.
-- pg_trgm: trigram indexes for fast trail name search.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- TimescaleDB is optional in this migration; it is enabled by the
-- create_hypertable() call in 006_trek_pings.sql only if the extension exists.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB not available — trek_pings will use a plain Postgres table. Install TimescaleDB in production.';
END;
$$;
