# AI news app

SvelteKit UI for the briefing site at https://eh-ai-blast.app, on a DigitalOcean droplet (`ssh ai-briefing-do`). `infra/` has the Terraform for the droplet and Cloudflare; see [infra/README.md](infra/README.md).

Edit this checkout. The database is not in this repo. The ingest container on the droplet updates `briefing.db` (in the `ai-news-app_data` volume) from Grok Bot's Drive files (see below), and the app only reads it.

## Develop

```sh
npm install
npm run dev
```

Production is Node 26. `npm run dev` reads `data/briefing.db` (gitignored), or whatever `BRIEFING_DB` points at. If that file is missing, `npm run dev` first pulls a copy from the droplet over SSH. Run `npm run db:pull` to refresh it. The data dir isn't readable by `evanh`, so the pull reads it with `sudo`.

`npm test` runs the ingest tests (`node:test`, `ingest/*.test.js`), then the app's (Vitest, `src/**/*.test.ts`: `src/lib`, `db.ts`, the route loaders and the `/api/v1` handlers). Vitest points `BRIEFING_DB` at a temp database built from the migrations and a few sample briefings (`src/lib/server/test-fixture.ts`), never `data/briefing.db`. `npx vitest` reruns them on save.

## API

Read-only JSON under `/api/v1`, all `GET`. Every text field is plain text, never markdown or HTML; links come as `{ label, url }` data. Errors are `{ "error": "..." }` with the matching status. The handlers are in `src/routes/api/v1/`, the shared helpers in `src/lib/server/api.ts`, and the row-to-JSON shaping in `shared/api-shape.js`.

An item is `{ id, position, header, body, links }`. `header` is the bold headline; `body` is the text after it and its dash or colon (`items.summary`), with bold and code reduced to their text, inline links to their labels, and the citation links that end the line (`[Reuters](…) [AP](…)`) dropped, since they're in `links`. If the line is only links, their labels stay. The outage item's `header` is `"Outages"` and its `body` is all of its text, one line per bullet.

- `/api/v1/briefings?page=N`: 30 per page, newest first, as `{ date, title, coverage, intro, outage_alert, count }`, plus `total`, `page` and `pages`.
- `/api/v1/briefings/latest`: the newest briefing, `{ date, title, coverage, intro, outage_alert, outage, sections: [{ title, note, items }] }` (404 if there are none). `outage` is an item or null.
- `/api/v1/briefings/YYYY-MM-DD`: one briefing (400 for a bad date, 404 if missing).
- `/api/v1/search?q=`: up to 50 hits, each an item plus `date` and `category`, with the same limits as `/search` (`src/lib/server/search-query.ts`).
- `/api/v1/sources`: the source list, in order, as `{ group, subgroup, position, text, links }`. Query templates keep their literal `<Month YYYY>` placeholders.

A day older than the latest is cached for a day; everything else for 5 minutes, since `briefing-pull` runs hourly.

## Deploy

```sh
npm run deploy
```

That deploys the images CI built for `HEAD` (tagged with its short SHA, so it must already be on `main`): it copies `compose.yaml` and the ingest units to `/opt/ai-briefing/compose` on the droplet, writes the tag to the `.env` there, pulls the images, runs ingest once, then restarts the app and web tunnel and waits for the app's healthcheck. To roll back, deploy an older commit (`TAG=<sha> npm run deploy`).

## CI/CD

`.github/workflows/deploy.yml` checks migrations, type-checks (including the plain JS in `ingest/`, through `checkJs` and JSDoc types), tests and builds every PR and push to `main`. Its `images` job builds the app and ingest Docker images on every PR, and on `main` pushes them to GHCR as `ghcr.io/evanh1393/ai-news-app-{app,ingest}:<short sha>`. A push to `main` (a merged PR) also deploys: the deploy job SSHes to `ssh.eh-ai-blast.app`, which Cloudflare Access only lets through with the CI service token, and the Cloudflare Tunnel delivers it to sshd on the droplet's `127.0.0.1:22`. It logs in as `evanh` with a CI-only key (`deploy/ci_authorized_key`: usable only from 127.0.0.1, i.e. through the tunnel, with no forwarding) and runs `npm run deploy`. `deploy/known_hosts` pins the droplet's host key. The droplet's public port 22 stays closed.

Secrets, all in the `production` environment (not repo secrets), so only the deploy job on `main` gets them: `DEPLOY_SSH_KEY` (the CI key's private half; its only copy), and `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (`terraform output` in `infra/`).

To rotate the CI key (e.g. it may have leaked):

```sh
ssh-keygen -t ed25519 -N '' -C ai-briefing-ci-deploy -f ~/.ssh/ai-briefing-ci-new
printf 'restrict,from="127.0.0.1,::1" %s\n' "$(cat ~/.ssh/ai-briefing-ci-new.pub)" > deploy/ci_authorized_key
# Commit that, merge it, and let CI deploy with the old key. deploy.sh swaps the old key's line on the
# droplet for the new one (any line with the ai-briefing-ci-deploy comment), so the old key stops working.
gh secret set DEPLOY_SSH_KEY --env production < ~/.ssh/ai-briefing-ci-new
rm ~/.ssh/ai-briefing-ci-new ~/.ssh/ai-briefing-ci-new.pub
gh run rerun "$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')"  # deploys with the new key
```

Keep the `ai-briefing-ci-deploy` comment on the key: it's how `deploy.sh` finds the old line to replace.

## Hosting

Visitors reach `eh-ai-blast.app` through Cloudflare, which forwards over the `ai-briefing-web` Cloudflare Tunnel to the cloudflared container, then to the app container (see Containers). The host's own cloudflared runs the `ai-briefing` tunnel, which now only carries CI's SSH. The app sets the security headers (`src/hooks.server.ts`) and CSP (`vite.config.ts`). Static files skip the hook, so Cloudflare also sets `X-Content-Type-Options: nosniff` on every response (`infra/cloudflare.tf`), and it compresses responses. The tunnel is an outbound connection, so the droplet takes no inbound web traffic. People SSH over Tailscale (`ssh ai-briefing-do`, MagicDNS name `ai-briefing-do`), and CI through the tunnel (see CI/CD), so the DigitalOcean firewall (`infra/main.tf`) has no inbound rules at all and `ufw` only allows port 22 on `tailscale0`. Root login and passwords are off. The droplet is `tag:ai-briefing-do` in the tailnet policy, which lets your devices reach its port 22 and gives it no access to anything else on the tailnet. If Tailscale is down, use the Droplet Console in DigitalOcean. Cloudflare rate-limits `/search` and `/api/v1/search` per IP (`infra/cloudflare.tf`).

Error pages: the app renders its own errors (404, 400, 500…) in the site layout with `src/routes/+error.svelte`, falling back to the static `src/error.html` if the layout itself fails. When the app is down or restarting, and for errors raised before a request reaches it (the search rate limit's 429, a tunnel outage), visitors get Cloudflare's own error pages.

`deploy/provision.sh` set up the droplet once (packages including Docker, users, directories, `ufw`, sshd). After it, `sudo tailscale up --advertise-tags=tag:ai-briefing-do --hostname=ai-briefing-do` joined the tailnet, `cloudflared service install` took the host tunnel's token from `terraform output -raw tunnel_token`, the web tunnel's token went to `/etc/ai-briefing/tunnel-token` (see Containers), and `/etc/ai-briefing/drive-key.json` was copied over by hand. To provision a new droplet, first add a temporary inbound SSH rule for your IP to `digitalocean_firewall.ai_briefing`, and remove it once Tailscale is up.

## Containers

`Dockerfile` builds the app and `ingest/Dockerfile` builds ingest, and `compose.yaml` runs them with cloudflared. Every container has a read-only filesystem, no capabilities and `no-new-privileges`. The app is only on an internal network, so it can't open any connection out, and it mounts the data volume read-only. (Under systemd, `IPAddressDeny` did this, and before that an nftables egress firewall on CT 101, an LXC container where systemd ignored `IPAddressDeny`.) Only cloudflared and ingest can reach the internet. No port is published on the host. cloudflared serves the separate `ai-briefing-web` tunnel (`infra/cloudflare.tf`), because from inside compose it can't reach the host's sshd, so the existing tunnel stays on the host for CI's SSH.

The secrets are files in `SECRETS_DIR` (default `/etc/ai-briefing`): `drive-key.json` and `tunnel-token` (`terraform output -raw web_tunnel_token`). Compose bind-mounts them with their host permissions. cloudflared (uid 65532) reads `tunnel-token`, so it's `65532:65532 0400`. `drive-key.json` stays `root:briefing-pull 0640`, and ingest (uid 1000, which is `evanh` on the droplet) reads it by joining the group: set `DRIVE_KEY_GID` to `briefing-pull`'s gid in a `.env` next to `compose.yaml`.

On the droplet the project lives in `/opt/ai-briefing/compose` (`deploy.sh` installs it), and `briefing.db` in the `ai-news-app_data` volume.

```bash
cd /opt/ai-briefing/compose
sudo docker compose ps                    # app + cloudflared
sudo docker compose logs -f app
sudo docker compose run --rm ingest       # one pull; --check, --dry-run etc. pass through
```

## Briefing ingest (Drive pull)

Grok Bot writes `briefing-YYYY-MM-DD.md` to the "AI Briefings" Google Drive folder. The same folder holds `sources.md`, the source list Grok Bot reads at the start of each run. Grok Bot only reads it; we edit it. It's the only copy, so edit or replace it there and both the bot and the Sources page pick it up (`ingest/sources-md.js` has the format, and an off-format upload is skipped, leaving the old list). The droplet pulls both: `briefing-pull.timer` runs the ingest container (`ingest/pull.js`) at 8:00 AM ET and hourly at :10. It authenticates with a service account (`/etc/ai-briefing/drive-key.json`) that has no project roles, only a Viewer share on that folder. New or changed files are validated strictly (`ingest/briefing-md.js`; off-format files are logged and skipped) and upserted one date at a time into a copy of `briefing.db` that is then renamed into place (the previous file is kept as `briefing.db.prev`). The ingest container is locked down like the app, except it can reach the network, which it needs for Google, and it can write the data volume. `npm run deploy` also runs it once, before restarting the app.

The database stores markdown (`*_md` columns), never HTML; the other text columns are plain (`items.body` is the whole item for search, `items.summary` the part after the headline for the API). The app renders it with `shared/inline-md.js` and `Markdown.svelte` as Svelte text: only links (plain `https` URLs), bold and code become markup, and there is no `{@html}`, so a bad row can look wrong but can't inject anything. The CSP in `vite.config.ts` is the backstop.

```sh
cd /opt/ai-briefing/compose
sudo docker compose run --rm ingest --check     # list the folder, no DB access
sudo docker compose run --rm ingest --dry-run   # download + validate, no writes
journalctl -u briefing-pull                     # run history
```

`npm test` covers the parser and the DB writes, and the app's reads of them.

Grok Bot used to push a whole `briefing.db` over SSH as `newsbot`. That path is gone: the upload shell, the account and `/opt/ai-briefing/docs` were removed from CT 101, the homelab container that hosted the site before the droplet, on 2026-10-13.

## Schema migrations

The schema is the numbered SQL files in `ingest/migrations/`. `PRAGMA user_version` records the last one applied. `0001_baseline.sql` is the schema as of 2026-10-13; databases from before migrations existed were adopted at version 1 without running it.

To change the schema:

1. Add `ingest/migrations/NNNN_short_name.sql` with the next number. Plain SQL, no `BEGIN`/`COMMIT`; the runner wraps every pending file in one transaction. SQLite's `ALTER TABLE` is limited, so bigger changes rebuild the table.
2. Update `src/lib/server/schema.ts` to match, and the writes in `ingest/apply.js` if columns changed.
3. `npm test` builds a fresh database from every migration and checks `schema.ts` against it.

If existing rows need data SQL can't compute (parsing markdown, say), add a step for that version to `AFTER_MIGRATION` in `ingest/apply.js`. It runs right after the migration's SQL, in the same transaction. `0003_item_summary.sql` explains why that beats forcing a re-ingest from Drive.

`briefing-pull` applies pending migrations on its copy of the database before ingesting, and commits even if there are no new Drive files. `npm run deploy` runs it before restarting the app, so the app never reads a schema older than its code. Write migrations so the old app still works with the new schema if you can (add columns before dropping them), because a failed deploy can leave the old app running on the migrated database. To try one locally, `npm run db:migrate` applies pending migrations to `data/briefing.db` (`npm run db:pull` gets a fresh copy first).

Checks:

- CI (`ingest/check-migrations.sh`) fails if a PR edits, renames or deletes a migration that's already on `main`. Those have run in production and won't run again.
- `npm test` runs every migration on an empty database, then `verify()`: SQLite's `integrity_check`, `foreign_key_check`, and an FTS integrity check of `items_fts` against `items`. It also fails if `schema.ts` and the migrated tables disagree on column names, types or `NOT NULL`.
- In production, `briefing-pull` runs the same `verify()` on the migrated copy before swapping it in, so a migration that breaks real data never goes live. The pull fails and the old database stays.
