#!/usr/bin/env bash
# Copy CT 101's briefing.db to data/briefing.db for `npm run dev`.
# --if-missing: do nothing when a local copy already exists (used by `predev`).
# Grok Bot swaps the file in atomically and it has no WAL, so a plain read is consistent.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
host=ai-briefing
remote=/opt/ai-briefing/data/briefing.db
local_db="$root/data/briefing.db"

if [[ "${1:-}" == --if-missing && -f "$local_db" ]]; then
  exit 0
fi

mkdir -p "$root/data"
echo "pulling $host:$remote"
# The data dir is newsbot:briefing 0750, so evanh reads it through sudo.
ssh "$host" "sudo -n cat '$remote'" > "$local_db.tmp"
node -e '
  const db = new (require("better-sqlite3"))(process.argv[1], { readonly: true });
  const ok = db.pragma("quick_check", { simple: true });
  if (ok !== "ok") { console.error("quick_check: " + ok); process.exit(1); }
' "$local_db.tmp"
mv "$local_db.tmp" "$local_db"
echo "wrote data/briefing.db ($(du -h "$local_db" | cut -f1))"
