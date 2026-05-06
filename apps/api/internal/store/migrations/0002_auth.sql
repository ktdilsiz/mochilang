-- 0002_auth: identity + sessions.
--
-- Existing users keep their UUID-shaped `id` (server-minted from now on).
-- Email and google_sub get partial unique indexes so legacy rows with
-- NULL identity columns coexist with new authenticated rows.

ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN picture TEXT; -- Google avatar URL, optional

CREATE UNIQUE INDEX idx_users_email_unique
  ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_google_sub_unique
  ON users(google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,    -- sha256(token), hex-encoded
  user_id       TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  user_agent    TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
