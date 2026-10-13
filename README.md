# AI news app

SvelteKit UI for the briefing site on homelab CT 101 (`ssh ai-briefing`).

Edit this checkout. The database is not in this repo. Grok Bot replaces `/opt/ai-briefing/data/briefing.db` on the container, and the app only reads it.

## Develop

```sh
npm install
npm run dev
```

Production on CT 101 is Node 22. `npm run dev` reads `data/briefing.db` (gitignored), or whatever `BRIEFING_DB` points at. If that file is missing, `npm run dev` first pulls a copy from CT 101 over SSH. Run `npm run db:pull` to refresh it. The data dir is `newsbot`-only, so the pull reads it with `sudo` as `evanh`.

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

Grok Bot uploads as `newsbot`, whose login shell is `deploy/briefing-upload` (installed to `/usr/local/sbin/briefing-upload` by `npm run deploy`). Whatever command it is sent, it only reads a gzipped tar of `briefing.db` and `README.md` from stdin and swaps them into `/opt/ai-briefing/data` and `/opt/ai-briefing/docs`. `newsbot` owns those two directories and nothing else.
