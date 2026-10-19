# Ingest: pulls the briefings from Drive into briefing.db (ingest/pull.js). Build from the repo root:
#   docker build -f ingest/Dockerfile -t ai-news-app-ingest .
# The Drive key is mounted at run time, never built in. Extra args go to pull.js, e.g. `--check`.
FROM node:26-alpine
LABEL org.opencontainers.image.source=https://github.com/evanh1393/ai-news-app

WORKDIR /app
# Runtime packages only. better-sqlite3 ships prebuilt binaries (musl included), so skip node-gyp.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY shared/ shared/
COPY ingest/ ingest/

ENV BRIEFING_DB=/data/briefing.db \
    DRIVE_KEY=/run/secrets/drive-key.json
USER node
ENTRYPOINT ["node", "ingest/pull.js"]
