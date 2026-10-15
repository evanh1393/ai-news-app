-- search() (src/lib/server/db.ts) only queries items_fts when meta.fts = '1', and falls back to LIKE
-- otherwise. 0001 always creates items_fts and apply.js keeps it in sync, so turn the flag on.
-- Production already had it from Grok Bot's database; a database built from the migrations didn't.
INSERT OR REPLACE INTO meta (key, value) VALUES ('fts', '1');
