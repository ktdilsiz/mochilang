-- 0003_community_packs: user-authored lesson packs.
--
-- A "pack" is the standalone unit: full Level-shaped JSON body (topics +
-- lessons + exercises) plus its own declared source/target language pair.
-- Body is stored as TEXT so we don't have to keep Go structs in lockstep
-- with the JSON shape — the server validates at submit time, then streams
-- it through verbatim, same as canonical content.
--
-- `handle` is added to users for public-facing pack URLs (/c/{handle}/{slug}).
-- Nullable so existing users keep working; populated on first publish.

ALTER TABLE users ADD COLUMN handle TEXT;
CREATE UNIQUE INDEX idx_users_handle_unique
  ON users(handle) WHERE handle IS NOT NULL;

CREATE TABLE community_packs (
  id              TEXT PRIMARY KEY,           -- ulid/uuid; opaque
  author_user_id  TEXT NOT NULL,
  slug            TEXT NOT NULL,              -- kebab-case, unique per author
  source_lang     TEXT NOT NULL,              -- e.g. "en"
  target_lang     TEXT NOT NULL,              -- e.g. "tr"
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  body_json       TEXT NOT NULL,              -- Level-shaped JSON
  version         INTEGER NOT NULL DEFAULT 1, -- bumps on update
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (author_user_id, slug)
);

CREATE INDEX idx_community_packs_author ON community_packs(author_user_id);
CREATE INDEX idx_community_packs_langs ON community_packs(source_lang, target_lang);
CREATE INDEX idx_community_packs_created ON community_packs(created_at DESC);
