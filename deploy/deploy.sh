#!/usr/bin/env bash
# Deploy the images CI pushed for this commit to the droplet: install compose.yaml and the ingest units,
# pull the images, run ingest once (migrations first), then restart the app and the web tunnel.
# The data volume is ingest's; this never touches it directly.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
host=${DEPLOY_HOST:-ai-briefing-do}
remote=/opt/ai-briefing/compose
# The images are tagged with the short SHA of the commit CI built (deploy.yml's images job), so from a
# laptop this deploys HEAD, which must already be on main.
tag=${TAG:-$(git -C "$root" rev-parse HEAD)}
tag=${tag:0:7}

echo "authorizing the CI deploy key"
# Only usable from 127.0.0.1, i.e. through the Cloudflare Tunnel (see deploy.yml). Replaces any other
# line with the ai-briefing-ci-deploy comment, so rotating the key also revokes the old one. Idempotent.
ssh "$host" 'set -euo pipefail
  key=$(cat)
  [ -n "$key" ]
  f=~/.ssh/authorized_keys
  # grep exits 1 when every line is a CI key (fine) and 2 on an error (stop before touching the file).
  grep -vF ai-briefing-ci-deploy "$f" > "$f.tmp" || [ $? -eq 1 ]
  printf "%s\n" "$key" >> "$f.tmp"
  chmod 600 "$f.tmp"
  mv "$f.tmp" "$f"' < "$root/deploy/ci_authorized_key"

echo "installing compose.yaml and the ingest units ($tag)"
scp "$root/compose.yaml" "$root/deploy/briefing-pull.service" "$root/deploy/briefing-pull.timer" "${host}:/tmp/"
ssh "$host" "set -euo pipefail
  sudo install -d -m 755 '$remote'
  sudo install -m 644 /tmp/compose.yaml '$remote/compose.yaml'
  # TAG picks the images; ingest joins briefing-pull's group to read drive-key.json (compose.yaml).
  printf 'TAG=%s\nDRIVE_KEY_GID=%s\n' '$tag' \"\$(getent group briefing-pull | cut -d: -f3)\" \
    | sudo tee '$remote/.env' >/dev/null
  sudo cp /tmp/briefing-pull.service /tmp/briefing-pull.timer /etc/systemd/system/
  rm -f /tmp/compose.yaml /tmp/briefing-pull.service /tmp/briefing-pull.timer
  sudo systemctl daemon-reload
  sudo systemctl enable --quiet briefing-pull.timer
  sudo systemctl start briefing-pull.timer"

ssh "$host" "set -euo pipefail
  cd '$remote'
  sudo docker compose --profile ingest pull --quiet
  # Ingest before restarting, so the new app never reads a schema older than its code (ingest/apply.js
  # migrates it). A rejected Drive file makes this exit 1 after ingesting the rest, so check the page instead.
  sudo systemctl start briefing-pull.service || journalctl -u briefing-pull -n 20 --no-pager >&2
  # --wait: until the app's healthcheck passes (compose.yaml), or fail the deploy.
  sudo docker compose up -d --no-build --remove-orphans --wait --wait-timeout 90
  sudo docker compose ps --format '{{.Service}}: {{.Status}}'
  # Drop the app and ingest images of earlier deploys; a rollback pulls its tag again.
  old=\$(sudo docker image ls --format '{{.Repository}}:{{.Tag}}' \
    | grep '^ghcr.io/evanh1393/ai-news-app-' | grep -v ':$tag\$' || true)
  if [ -n \"\$old\" ]; then sudo docker image rm \$old >/dev/null; fi

  # One-time, from the move to containers (2026-10): the app ran as ai-briefing-app.service. Only after
  # the containers are healthy, so a failed first deploy leaves it running. Remove once it's gone.
  if [ -f /etc/systemd/system/ai-briefing-app.service ]; then
    sudo systemctl disable --now --quiet ai-briefing-app
    sudo rm /etc/systemd/system/ai-briefing-app.service
    sudo systemctl daemon-reload
    echo 'removed ai-briefing-app.service'
  fi"

echo "deployed $tag"
