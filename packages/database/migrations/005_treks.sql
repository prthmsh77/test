-- Trek state machine: PLANNED → ACTIVE → COMPLETED | OVERDUE → INCIDENT | CANCELLED
-- This is Shikhar's core entity. Every safety escalation is anchored to a trek row.

CREATE TYPE trek_status AS ENUM (
  'PLANNED', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'INCIDENT', 'CANCELLED'
);
CREATE TYPE sos_mode AS ENUM ('HELP', 'MEDICAL', 'CRITICAL');

CREATE TABLE treks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trail_id          UUID REFERENCES trails(id), -- nullable for custom/unnamed routes
  status            trek_status NOT NULL DEFAULT 'PLANNED',
  -- User's declared plan — used as anchor for escalation timers.
  planned_start_at  TIMESTAMPTZ NOT NULL,
  planned_end_at    TIMESTAMPTZ NOT NULL,
  -- Actual times populated when user taps Start / End Trek.
  actual_start_at   TIMESTAMPTZ,
  actual_end_at     TIMESTAMPTZ,
  -- Route the user declared (may differ from canonical trail route if doing a variant).
  declared_route    GEOGRAPHY(LINESTRING, 4326),
  max_altitude_meters INTEGER,
  group_size        SMALLINT NOT NULL DEFAULT 1,
  -- Live-track URL token: random 12-char slug, signed JWT generated at trek start.
  live_track_token  VARCHAR(32) UNIQUE,
  live_track_expires_at TIMESTAMPTZ,
  -- User consent to auto-call ERSS-112 at L4. Must be set per-trek (not a global preference)
  -- so the user actively opts in each time (PRD §7.1 step 3).
  erss_112_consent  BOOLEAN NOT NULL DEFAULT false,
  -- Current escalation level (L0–L5), updated as the Temporal workflow progresses.
  escalation_level  VARCHAR(2),
  -- Temporal workflow ID — needed to signal the workflow (e.g. extend end time, cancel).
  temporal_workflow_id VARCHAR(255),
  -- Coercion mode: duress PIN was entered; system is silently escalating to L4.
  is_duress         BOOLEAN NOT NULL DEFAULT false,
  -- Notes from the T&S team after incident review.
  incident_notes    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treks_user_id ON treks(user_id);
CREATE INDEX idx_treks_status ON treks(status) WHERE status IN ('ACTIVE', 'OVERDUE', 'INCIDENT');
CREATE INDEX idx_treks_trail_id ON treks(trail_id);
CREATE INDEX idx_treks_planned_end ON treks(planned_end_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_treks_live_track_token ON treks(live_track_token);

CREATE TRIGGER set_treks_updated_at
  BEFORE UPDATE ON treks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Junction table: which E-Contacts are notified for this specific trek.
-- Allows per-trek contact selection (user may not want all contacts notified every time).
CREATE TABLE trek_emergency_contacts (
  trek_id    UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (trek_id, contact_id)
);

-- Group members for a trek — enables group live-view and Power Bank Buddy feature.
CREATE TABLE trek_members (
  trek_id     UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_leader   BOOLEAN NOT NULL DEFAULT false,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trek_id, user_id)
);
