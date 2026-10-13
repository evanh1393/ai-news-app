#!/usr/bin/env bash
# Fail if a migration that exists at <base> was edited, renamed or deleted. Merged migrations have
# already run in production and won't run again, so a schema change always goes in a new NNNN_*.sql.
# CI runs this against the PR base (or the previous main); locally: bash ingest/check-migrations.sh origin/main
set -euo pipefail

base=${1:?usage: check-migrations.sh <base commit>}
changed=$(git diff --name-status --no-renames "$base" HEAD -- ingest/migrations | awk '$1 != "A"')
if [[ -n "$changed" ]]; then
  echo "merged migrations changed; add a new ingest/migrations/NNNN_*.sql instead:" >&2
  echo "$changed" >&2
  exit 1
fi
echo "ingest/migrations: only new files since $(git rev-parse --short "$base")"
