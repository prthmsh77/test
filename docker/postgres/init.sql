-- Run once on first container start.
-- The timescaledb-ha image includes PostGIS and TimescaleDB;
-- this script ensures they're enabled in the shikhar database.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
