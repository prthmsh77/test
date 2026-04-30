-- Notification log and user preferences.
-- The notifications table is an inbox — it powers the in-app notification centre.
-- Actual delivery (FCM, SMS, WhatsApp) is handled by the notification service
-- which writes delivery status back here.

CREATE TYPE notification_channel AS ENUM ('PUSH', 'SMS', 'WHATSAPP', 'IN_APP');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');
CREATE TYPE notification_category AS ENUM (
  'SAFETY_ESCALATION', -- L0-L5 events
  'TREK_UPDATE',       -- start, end, waypoint check-in
  'SOCIAL',            -- kudos, comments, follows
  'SYSTEM',            -- subscription, feature updates
  'WEATHER_ALERT'
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trek_id     UUID REFERENCES treks(id),
  category    notification_category NOT NULL,
  channel     notification_channel NOT NULL,
  title       TEXT,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}', -- deep-link params, action buttons
  status      notification_status NOT NULL DEFAULT 'PENDING',
  -- External provider message ID (FCM message ID, MSG91 request ID, etc.)
  provider_message_id TEXT,
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_trek ON notifications(trek_id) WHERE trek_id IS NOT NULL;

-- User notification preferences per category and channel.
CREATE TABLE notification_preferences (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category  notification_category NOT NULL,
  channel   notification_channel NOT NULL,
  enabled   BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, category, channel)
);
