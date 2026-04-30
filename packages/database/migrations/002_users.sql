-- Users and authentication

CREATE TYPE user_role AS ENUM ('USER', 'OPERATOR', 'SENTINEL', 'ADMIN');
CREATE TYPE supported_language AS ENUM ('en', 'hi', 'mr', 'bn', 'ta', 'kn', 'ml', 'te');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(15) NOT NULL UNIQUE, -- E.164 format e.g. +919876543210
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  role          user_role NOT NULL DEFAULT 'USER',
  -- Verified badge: IMF-certified guide, registered operator, etc.
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  preferred_language supported_language NOT NULL DEFAULT 'en',
  -- Pro subscription status and expiry tracked here for quick gate checks.
  -- The source of truth for billing is Razorpay; this is a cached flag.
  pro_subscription BOOLEAN NOT NULL DEFAULT false,
  pro_expires_at   TIMESTAMPTZ,
  -- Soft-delete: banned users are deactivated, not deleted, to preserve audit trails.
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth tokens issued per session; JWT payload references this table.
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  user_agent  TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP flow: each OTP request creates a row; verified=true on successful match.
-- Rows expire after 10 minutes and are cleaned up by a scheduled job.
CREATE TABLE otp_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(15) NOT NULL,
  otp_hash    VARCHAR(64) NOT NULL, -- SHA-256 of the 6-digit OTP
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified    BOOLEAN NOT NULL DEFAULT false,
  attempts    SMALLINT NOT NULL DEFAULT 0, -- max 3 attempts to prevent brute-force
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role) WHERE role != 'USER'; -- sparse: most users are USER role
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_otp_phone_created ON otp_requests(phone, created_at DESC);

-- Auto-update updated_at on every row change.
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
