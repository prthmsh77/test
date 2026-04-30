-- Social layer: posts, comments, kudos, follows, groups.
-- Feed read is handled by fan-out-on-write to Redis; these tables are the source of truth.

CREATE TYPE post_type AS ENUM ('TEXT', 'PHOTO', 'VIDEO', 'TREK_RECAP');

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trek_id     UUID REFERENCES treks(id), -- optional link to a trek
  trail_id    UUID REFERENCES trails(id), -- optional link to a trail
  type        post_type NOT NULL DEFAULT 'TEXT',
  body        TEXT,
  media_urls  TEXT[] NOT NULL DEFAULT '{}',
  -- GPX data for trek replay embedded in post.
  gpx_url     TEXT,
  -- Live posts auto-tag location, elevation, km marker.
  location    GEOGRAPHY(POINT, 4326),
  altitude_meters INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT true,
  kudos_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_trail_id ON posts(trail_id);
CREATE INDEX idx_posts_trek_id ON posts(trek_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC) WHERE is_published = true;
CREATE INDEX idx_posts_location_gist ON posts USING GIST(location);

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);

CREATE TABLE kudos (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Social graph: follow relationship.
-- "Trekking Buddy" is a higher trust tier — mutual follow with explicit buddy acceptance.
CREATE TABLE follows (
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_buddy      BOOLEAN NOT NULL DEFAULT false, -- Trekking Buddy tier
  buddy_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- Trek Groups / Crews (e.g. "Bangalore Hikers Club")
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  creator_id  UUID NOT NULL REFERENCES users(id),
  is_private  BOOLEAN NOT NULL DEFAULT false,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
