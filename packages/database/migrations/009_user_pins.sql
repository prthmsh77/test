-- PIN columns for trek check-out 2FA (PRD §7.4) and coercion/duress mode (PRD §7.6).
-- Both are stored as SHA-256 hashes — never plaintext.
-- Null means the user hasn't set a PIN yet; the API skips 2FA in that case (onboarding flow).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trek_pin_hash  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS duress_pin_hash VARCHAR(64);
