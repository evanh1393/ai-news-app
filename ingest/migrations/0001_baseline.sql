-- The schema as of 2026-10-13: Grok Bot's original tables after the *_md migration, plus drive_files.
-- Databases that already had these tables were adopted at version 1 without running this file.

CREATE TABLE briefings (
  date         TEXT PRIMARY KEY,          -- 'YYYY-MM-DD'
  title        TEXT NOT NULL,             -- the '# ' heading
  coverage     TEXT,                      -- the '_Coverage: ..._' line (plain text)
  outage_alert INTEGER NOT NULL DEFAULT 0,-- 1 if the briefing's outage summary is an alert
  created_at   TEXT NOT NULL,             -- ingest time, ISO 8601
  intro_md     TEXT                       -- inline markdown
);

CREATE TABLE sections (
  briefing_date TEXT NOT NULL REFERENCES briefings(date) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  title         TEXT NOT NULL,
  note_md       TEXT,
  PRIMARY KEY (briefing_date, position)
);

CREATE TABLE items (
  id            INTEGER PRIMARY KEY,
  briefing_date TEXT NOT NULL REFERENCES briefings(date) ON DELETE CASCADE,
  category      TEXT NOT NULL,            -- section title, e.g. '🤖 New Models & Releases'
  position      INTEGER NOT NULL,         -- item number within the briefing (0 for outage summary)
  headline      TEXT,                     -- bold lead sentence, plain text
  body          TEXT NOT NULL,            -- full item text, plain text (links stripped) for search
  is_outage     INTEGER NOT NULL DEFAULT 0,
  body_md       TEXT NOT NULL DEFAULT '',
  UNIQUE (briefing_date, is_outage, position)
);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_date     ON items(briefing_date, position);

-- External content, no triggers: ingest/apply.js keeps it in sync.
CREATE VIRTUAL TABLE items_fts USING fts5(headline, body, content='items', content_rowid='id');

CREATE TABLE item_links (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  url     TEXT NOT NULL
);
CREATE INDEX idx_links_item ON item_links(item_id);
CREATE INDEX idx_links_url  ON item_links(url);

CREATE TABLE outage_checks (
  id         INTEGER PRIMARY KEY,
  checked_at TEXT NOT NULL,               -- ISO 8601 in America/New_York, e.g. 2026-10-10T22:00:00-04:00
  is_alert   INTEGER NOT NULL,            -- 0 when the text starts with 'No alert'
  text       TEXT NOT NULL,
  UNIQUE (checked_at, text)
);
CREATE INDEX idx_outage_time ON outage_checks(checked_at);

CREATE TABLE sources (
  id       INTEGER PRIMARY KEY,
  grp      TEXT NOT NULL,                 -- '## ' heading, e.g. '2. X (x namespace tools)'
  subgroup TEXT,                          -- '### ' heading, if any
  position INTEGER NOT NULL,
  value_md TEXT NOT NULL,                 -- the bullet, inline markdown
  note     TEXT                           -- reserved for annotations
);
CREATE INDEX idx_sources_grp ON sources(grp, position);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);

-- Which Drive files have been ingested, so unchanged files are skipped.
CREATE TABLE drive_files (
  name        TEXT PRIMARY KEY,
  file_id     TEXT NOT NULL,
  md5         TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);
