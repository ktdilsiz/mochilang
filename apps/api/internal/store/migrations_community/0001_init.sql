-- 0001_init (community.db): user-generated content around community packs.
--
-- Lives in its own SQLite file so we can wipe/back up UGC chatter
-- independently of canonical content and identity. We can't cross-DB JOIN
-- in SQLite — anywhere the API needs to surface a comment-with-author, the
-- handler hydrates user info from the main DB after pulling the comment
-- row from here.
--
-- pack_id and user_id are kept as TEXT and intentionally NOT foreign keys
-- (the rows they reference live in main.db). Orphans are possible if a
-- pack or user is deleted; cleanup is best-effort from the application
-- layer.

CREATE TABLE pack_ratings (
  pack_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (pack_id, user_id)
);

CREATE INDEX idx_pack_ratings_pack ON pack_ratings(pack_id);

CREATE TABLE pack_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_pack_comments_pack ON pack_comments(pack_id, created_at DESC);

CREATE TABLE pack_reports (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id         TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  reason          TEXT NOT NULL, -- 'spam' | 'offensive' | 'copied_content' | 'low_quality' | 'incorrect' | 'other'
  notes           TEXT,
  created_at      INTEGER NOT NULL,
  UNIQUE (pack_id, reporter_user_id)
);

CREATE INDEX idx_pack_reports_pack ON pack_reports(pack_id);

-- pack_moderation tracks aggregate state so list queries can filter
-- hidden packs without scanning pack_reports. Updated in-Go on each new
-- report. hidden=1 means the pack accumulated >= MODERATION_HIDE_THRESHOLD
-- reports or an admin manually hid it.
CREATE TABLE pack_moderation (
  pack_id        TEXT PRIMARY KEY,
  report_count   INTEGER NOT NULL DEFAULT 0,
  hidden         INTEGER NOT NULL DEFAULT 0,
  hidden_at      INTEGER,
  hidden_reason  TEXT, -- 'auto' | 'admin'
  updated_at     INTEGER NOT NULL
);
