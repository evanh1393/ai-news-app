# AI news app

SvelteKit UI for the briefing site on homelab CT 101 (`ssh ai-briefing`).

Edit this checkout. The database is not in this repo. Grok Bot replaces `/opt/ai-briefing/data/briefing.db` on the container, and the app only reads it.

## Develop

```sh
npm install
npm run dev
```

Production on CT 101 is Node 22. `npm run dev` reads a database only if `BRIEFING_DB` points at one.

## Deploy

```sh
npm run deploy
```

That builds here with Node 22, copies the app and `deploy/Caddyfile` to CT 101, restarts `ai-briefing-app`, and reloads Caddy. When `package-lock.json` changes, the script also runs `npm ci` on the container. `node build` needs those packages at runtime.

## CI/CD

`.github/workflows/deploy.yml` type-checks and builds every PR. A push to `main` (a merged PR) also deploys: the runner joins the tailnet as an ephemeral `tag:ci` node, Tailscale SSH lets it in to CT 101 (`tag:briefing`) as `evanh`, and it runs `npm run deploy`. `deploy/known_hosts` pins CT 101's host key.

Repo secrets: `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`, from a Tailscale OAuth client with the `auth_keys` write scope and tag `tag:ci`.
