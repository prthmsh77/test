-- Migration 010: WikiGIS entity versioning and audit trails
-- Applies Kart-style versioning to trails to support crowdsourced editing

BEGIN;

-- Create an enum for edit statuses
CREATE TYPE edit_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

-- Create a table to track trail versions/edits
CREATE TABLE IF NOT EXISTS trail_edits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    parent_version_id UUID REFERENCES trail_edits(id) ON DELETE SET NULL, -- for branching/Kart logic
    route_geom GEOGRAPHY(LineString, 4326) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., changes made, rationale
    status edit_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for querying edits by trail
CREATE INDEX IF NOT EXISTS idx_trail_edits_trail_id ON trail_edits(trail_id);

-- Index for the geographic route in edits to support spatial queries on proposals
CREATE INDEX IF NOT EXISTS idx_trail_edits_route_geom ON trail_edits USING GIST (route_geom);

-- Introduce UserRank and TrailRank into existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_rank NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS trail_rank NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES trail_edits(id) ON DELETE SET NULL;

COMMIT;
