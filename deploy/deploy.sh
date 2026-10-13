#!/usr/bin/env bash
# Build on this machine with Node 22 and ship the app, Caddyfile, and units to the droplet.
# Does not touch /opt/ai-briefing/data. briefing-pull.timer updates briefing.db there from Drive.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
host=${DEPLOY_HOST:-ai-briefing-do}
remote=/opt/ai-briefing/app
cd "$root"

npm22() {
  if command -v mise >/dev/null 2>&1; then
    mise exec node@22 -- "$@"
    return
  fi
  local major
  major=$(node -p 'process.versions.node.split(".")[0]')
  if [[ "$major" != "22" ]]; then
    echo "The droplet runs Node 22. This machine is Node $(node -v), and mise is not available." >&2
    exit 1
  fi
  "$@"
}

# PREBUILT=1: build/ already exists (CI builds it in a job that has no deploy credentials).
if [[ "${PREBUILT:-}" != 1 ]]; then
  echo "installing local dependencies"
  npm22 npm ci
fi

lock_local=$(sha256sum package-lock.json | awk '{print $1}')
# Written only after a successful server install, so a failed or partial npm ci forces a retry.
lock_marker="$remote/node_modules/.deployed-lock-sha256"
lock_remote=$(ssh "$host" "cat '$lock_marker' 2>/dev/null" || true)
need_deps=0
if [[ "$lock_local" != "$lock_remote" ]]; then
  need_deps=1
fi

echo "syncing source"
# From a laptop the checkout has more than git does: honor .gitignore (Terraform state with the tunnel
# token, data/briefing.db, .env) and skip what the server never runs (infra/, CI config).
rsync -rl --delete \
  --filter=':- .gitignore' \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.svelte-kit/' \
  --exclude 'build/' \
  --exclude 'deploy/' \
  --exclude '.npm/' \
  --exclude 'infra/' \
  --exclude '.github/' \
  --exclude '.claude/' \
  "$root/" "${host}:${remote}/"

if [[ "$need_deps" == 1 ]]; then
  echo "installing server dependencies"
  # Runtime packages only. --ignore-scripts: better-sqlite3 ships prebuilt binaries, but npm ci
  # still tries node-gyp for it, and the droplet has no compiler.
  ssh "$host" "cd '$remote' && npm ci --omit=dev --ignore-scripts && echo '$lock_local' > '$lock_marker'"
fi

if [[ "${PREBUILT:-}" != 1 ]]; then
  echo "building"
  npm22 npm run build
fi

echo "syncing build"
rsync -rl --delete "$root/build/" "${host}:${remote}/build/"

echo "authorizing the CI deploy key"
# Only usable from 127.0.0.1, i.e. through the Cloudflare Tunnel (see deploy.yml). Idempotent.
ssh "$host" "grep -qxF '$(cat "$root/deploy/ci_authorized_key")' ~/.ssh/authorized_keys || cat >> ~/.ssh/authorized_keys" \
  < "$root/deploy/ci_authorized_key"

echo "installing Caddyfile, systemd units, and egress firewall"
scp "$root/deploy/Caddyfile" "${host}:/tmp/Caddyfile"
scp "$root/deploy/ai-briefing-app.service" "${host}:/tmp/ai-briefing-app.service"
scp "$root/deploy/briefing-pull.service" "$root/deploy/briefing-pull.timer" "${host}:/tmp/"
scp "$root/deploy/ai-briefing-egress.nft" "${host}:/tmp/ai-briefing-egress.nft"
ssh "$host" 'set -euo pipefail
  sudo caddy validate --adapter caddyfile --config /tmp/Caddyfile
  sudo nft -c -f /tmp/ai-briefing-egress.nft
  sudo cp /tmp/Caddyfile /etc/caddy/Caddyfile
  sudo cp /tmp/ai-briefing-app.service /etc/systemd/system/ai-briefing-app.service
  sudo cp /tmp/briefing-pull.service /tmp/briefing-pull.timer /etc/systemd/system/
  sudo install -D -m 644 /tmp/ai-briefing-egress.nft /etc/ai-briefing/egress.nft
  rm -f /tmp/Caddyfile /tmp/ai-briefing-app.service /tmp/ai-briefing-egress.nft \
    /tmp/briefing-pull.service /tmp/briefing-pull.timer
  sudo systemctl daemon-reload
  sudo systemctl enable --quiet briefing-pull.timer ai-briefing-app
  # Pull before restarting, so the new app never reads a schema older than its code (ingest/apply.js
  # migrates it). A rejected Drive file makes this exit 1 after ingesting the rest, so check the page instead.
  sudo systemctl start briefing-pull.service || journalctl -u briefing-pull -n 20 --no-pager >&2
  sudo systemctl reload caddy
  sudo systemctl restart ai-briefing-app
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
      curl -fsS -o /dev/null http://127.0.0.1:8080/
      systemctl is-active ai-briefing-app caddy
      exit 0
    fi
    sleep 0.5
  done
  echo "app did not answer on :3000" >&2
  systemctl status ai-briefing-app --no-pager >&2 || true
  exit 1
'
echo "deployed"
