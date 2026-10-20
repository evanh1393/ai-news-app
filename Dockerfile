# The app: SvelteKit (adapter-node), reading briefing.db read-only. Build from the repo root:
#   docker build --build-arg APP_VERSION=$(git rev-parse --short=7 HEAD) -t ai-news-app-app .
# ingest/Dockerfile is the other image; both share the data volume.
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Shown in the site footer (vite.config.ts); there's no .git here to read it from.
ARG APP_VERSION=unknown
RUN APP_VERSION=$APP_VERSION npm run build

# Runtime packages only, without the build tools. better-sqlite3 ships prebuilt binaries (musl included).
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:26-alpine
LABEL org.opencontainers.image.source=https://github.com/evanh1393/ai-news-app
WORKDIR /app
COPY package.json ./
COPY --from=deps /app/node_modules node_modules/
COPY --from=build /app/build build/
# Matches ingest/Dockerfile: whichever image creates the volume first, it ends up owned by node.
RUN mkdir /data && chown node:node /data

# 0.0.0.0 inside the container; compose decides who can reach it.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BRIEFING_DB=/data/briefing.db \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning
USER node
EXPOSE 3000
CMD ["node", "build"]
