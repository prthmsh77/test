-- Emergency contacts — max 5 per user (free tier), max 10 (Pro).
-- PRD §6.2: contacts receive SMS + push + WhatsApp deep link on trek start and escalation.
-- At least one contact must have notify_by_sms=true to allow trek start (guards against
-- silent failures when the contact has no app installed).

CREATE TABLE emergency_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(15) NOT NULL, -- E.164
  relation        VARCHAR(50) NOT NULL, -- "Mother", "Partner", etc. — free text
  notify_by_sms   BOOLEAN NOT NULL DEFAULT true,
  notify_by_whatsapp BOOLEAN NOT NULL DEFAULT false,
  notify_by_push  BOOLEAN NOT NULL DEFAULT false, -- only possible if contact has the app
  -- Contacts must reply to a confirmation SMS before they are active.
  -- This prevents users from adding strangers as emergency contacts (misuse/stalking vector).
  is_confirmed    BOOLEAN NOT NULL DEFAULT false,
  confirmation_token VARCHAR(32), -- random token sent in the confirmation SMS
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce max-5 at DB level for free users; the API layer enforces per-role limits.
  -- The UNIQUE constraint prevents duplicate phone numbers per user.
  UNIQUE (user_id, phone)
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

CREATE TRIGGER set_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
