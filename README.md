# AI news app

SvelteKit UI for the briefing site on homelab CT 101 (`ssh ai-briefing`).

Edit this checkout. The database is not in this repo. `briefing-pull` on the container updates `/opt/ai-briefing/data/briefing.db` from Grok Bot's Drive files (see below), and the app only reads it.

## Develop

```sh
npm install
npm run dev
```

Production on CT 101 is Node 22. `npm run dev` reads `data/briefing.db` (gitignored), or whatever `BRIEFING_DB` points at. If that file is missing, `npm run dev` first pulls a copy from CT 101 over SSH. Run `npm run db:pull` to refresh it. The data dir isn't readable by `evanh`, so the pull reads it with `sudo`.

## Deploy

```sh
npm run deploy
```

That builds here with Node 22, copies the app and `deploy/Caddyfile` to CT 101, restarts `ai-briefing-app`, and reloads Caddy. When `package-lock.json` changes (or the last server install failed), the script also runs `npm ci --omit=dev --ignore-scripts` on the container. `node build` loads the runtime `dependencies` (`better-sqlite3`, `drizzle-orm`) from there.

## CI/CD

`.github/workflows/deploy.yml` type-checks and builds every PR. A push to `main` (a merged PR) also deploys: the runner joins the tailnet as an ephemeral `tag:ci` node, Tailscale SSH lets it in to CT 101 (`tag:briefing`) as `evanh`, and it runs `npm run deploy`. `deploy/known_hosts` pins CT 101's host key.

Repo secrets: `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`, from a Tailscale OAuth client with the `auth_keys` write scope and tag `tag:ci`.

## Hardening on CT 101

`ai-briefing-app.service` runs sandboxed (`systemd-analyze security ai-briefing-app` ≈ 1.7): the filesystem is read-only to it, including its own code, and it has no capabilities. Before the app starts, the unit loads `deploy/ai-briefing-egress.nft` (installed to `/etc/ai-briefing/egress.nft`), which rejects every non-loopback connection the `briefing` and `caddy` users open, so neither the app nor Caddy can reach the tailnet, LAN or internet. systemd's `IPAddressDeny` would be simpler, but it does nothing in this LXC container. Anything else run as `briefing` (e.g. `npm install`) is blocked too; install packages as `evanh`.

## Briefing ingest (Drive pull)

Grok Bot writes `briefing-YYYY-MM-DD.md` to the "AI Briefings" Google Drive folder. CT 101 pulls it: `briefing-pull.timer` runs `ingest/pull.js` as `briefing-pull` at 7:40 AM ET and hourly at :10. It authenticates with a service account (`/etc/ai-briefing/drive-key.json`) that has no project roles, only a Viewer share on that folder. New or changed files are validated strictly (`ingest/briefing-md.js`; off-format files are logged and skipped) and upserted one date at a time into a copy of `briefing.db` that is then renamed into place (the previous file is kept as `briefing.db.prev`). The egress firewall limits `briefing-pull` to DNS and HTTPS. `npm run deploy` also runs it once, before restarting the app.

The database stores markdown (`*_md` columns), never HTML. The app renders it with `src/lib/inline-md.js` and `Markdown.svelte` as Svelte text: only links (plain `https` URLs), bold and code become markup, and there is no `{@html}`, so a bad row can look wrong but can't inject anything. The CSP in `vite.config.ts` is the backstop. `ingest/apply.js` owns the schema: the first pull after the markdown change migrated Grok Bot's `*_html` columns and re-ingested every day from Drive.

```sh
sudo -u briefing-pull node ingest/pull.js --check     # list the folder, no DB access
sudo -u briefing-pull node ingest/pull.js --dry-run   # download + validate, no writes
journalctl -u briefing-pull                           # run history
```

`npm test` covers the parser and the DB writes. Outage checks are paused (`src/lib/outages.ts`) until they have their own feed.

Grok Bot used to push a whole `briefing.db` over SSH as `newsbot`. That path is gone: the upload shell, the account and `/opt/ai-briefing/docs` were removed from CT 101 on 2026-10-13.
