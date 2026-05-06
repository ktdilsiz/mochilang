-- 0001_init: profile + progress + seed-data tables.

CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  name                TEXT,
  avatar_id           TEXT NOT NULL DEFAULT 'mochi-main',
  league_tier         INTEGER NOT NULL DEFAULT 0,
  league_week_start   TEXT,
  last_week_rank      INTEGER,
  last_week_change    TEXT, -- 'promoted' | 'demoted' | 'held' | NULL
  total_xp            INTEGER NOT NULL DEFAULT 0,
  streak              INTEGER NOT NULL DEFAULT 0,
  last_active_date    TEXT, -- YYYY-MM-DD local
  weekly_xp           INTEGER NOT NULL DEFAULT 0,
  week_start          TEXT, -- YYYY-MM-DD Monday of the active week
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE TABLE lesson_results (
  user_id        TEXT NOT NULL,
  lesson_id      TEXT NOT NULL,
  best_mistakes  INTEGER NOT NULL,
  completions    INTEGER NOT NULL DEFAULT 1,
  last_at        INTEGER NOT NULL, -- unix ms
  PRIMARY KEY (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lesson_results_user ON lesson_results(user_id);

-- Seed-data tables. Currently bot/friend rosters are server-managed (not
-- per-user). When real social features ship, friends will become a join
-- table on user_id.
CREATE TABLE friends (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  handle      TEXT NOT NULL,
  avatar      TEXT NOT NULL,
  flag        TEXT NOT NULL,
  total_xp    INTEGER NOT NULL,
  streak      INTEGER NOT NULL,
  languages   TEXT NOT NULL, -- comma-separated language codes
  weekly      INTEGER NOT NULL, -- baseline weekly XP for sparkline
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE competitors (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  avatar  TEXT NOT NULL, -- emoji
  flag    TEXT NOT NULL, -- emoji
  rate    INTEGER NOT NULL -- baseline daily XP
);
