-- Trail catalog with PostGIS spatial types.
-- The geometry column stores the full route as a LineString so PostGIS
-- can answer off-route detection (ST_Distance) with a spatial index scan —
-- never doing this in application memory (PRD non-negotiable).

CREATE TYPE trail_difficulty AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXTREME');
CREATE TYPE trail_region AS ENUM (
  'GARHWAL', 'KUMAON', 'HIMACHAL', 'KASHMIR', 'SIKKIM', 'NORTHEAST',
  'WESTERN_GHATS_NORTH', 'WESTERN_GHATS_SOUTH', 'ARAVALLIS', 'EASTERN_GHATS', 'OTHER'
);
CREATE TYPE waypoint_type AS ENUM (
  'CAMPSITE', 'WATER_SOURCE', 'HELIPAD', 'NETWORK_SPOT', 'DHABA',
  'ARMY_POST', 'MEDICAL', 'PERMIT_CHECK', 'VIEWPOINT'
);

CREATE TABLE trails (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  VARCHAR(120) NOT NULL UNIQUE, -- e.g. "kedarkantha-winter-trek"
  name                  VARCHAR(200) NOT NULL,
  region                trail_region NOT NULL,
  difficulty            trail_difficulty NOT NULL,
  max_altitude_meters   INTEGER NOT NULL,
  distance_km           NUMERIC(6,2) NOT NULL,
  typical_duration_days SMALLINT NOT NULL,
  -- Route stored as a geographic LineString (SRID 4326 = WGS84 lat/lng).
  -- Using GEOGRAPHY (not GEOMETRY) for distance calculations in metres on a sphere.
  route_geography       GEOGRAPHY(LINESTRING, 4326),
  -- Bounding box for quick regional queries without full geometry scan.
  bounding_box          GEOGRAPHY(POLYGON, 4326),
  requires_ilp          BOOLEAN NOT NULL DEFAULT false,
  requires_forest_permit BOOLEAN NOT NULL DEFAULT false,
  requires_imf_permit   BOOLEAN NOT NULL DEFAULT false,
  best_months           SMALLINT[] NOT NULL DEFAULT '{}', -- e.g. {10,11,12,1,2,3}
  cover_image_url       TEXT,
  description           TEXT,
  -- Aggregate stats updated asynchronously by a background job.
  review_count          INTEGER NOT NULL DEFAULT 0,
  avg_rating            NUMERIC(3,2),
  is_published          BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GiST index required for spatial queries (ST_DWithin, ST_Distance, ST_Intersects).
CREATE INDEX idx_trails_route_gist ON trails USING GIST(route_geography);
CREATE INDEX idx_trails_bbox_gist ON trails USING GIST(bounding_box);
CREATE INDEX idx_trails_region ON trails(region);
CREATE INDEX idx_trails_difficulty ON trails(difficulty);
-- Trigram index for fast fuzzy trail name search.
CREATE INDEX idx_trails_name_trgm ON trails USING GIN(name gin_trgm_ops);
CREATE INDEX idx_trails_slug ON trails(slug);

CREATE TRIGGER set_trails_updated_at
  BEFORE UPDATE ON trails
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Waypoints: fixed points of interest along a trail.
CREATE TABLE waypoints (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id         UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  type             waypoint_type NOT NULL,
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  altitude_meters  INTEGER,
  description      TEXT,
  -- Network operator name for NETWORK_SPOT type waypoints.
  network_operator VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waypoints_trail ON waypoints(trail_id);
CREATE INDEX idx_waypoints_location_gist ON waypoints USING GIST(location);
CREATE INDEX idx_waypoints_type ON waypoints(type);
