# Realtime Service — multi-stage, monorepo-aware.
# Build context MUST be the repo root:  docker build -f apps/realtime-service/Dockerfile .
# (or via the root docker-compose.yml which sets `context: .`)
#
# No Prisma here — realtime-service only talks to Redis (Pub/Sub) and Socket.IO.

# ---------- base ----------
# Alpine is ~5x smaller than Debian slim.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /repo

# ---------- deps + build ----------
FROM base AS build
RUN corepack enable
# Workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/realtime-service ./apps/realtime-service
RUN pnpm install --frozen-lockfile
# Build shared packages then the realtime-service.
RUN pnpm --filter @rocket/contracts --filter @rocket/redis build
RUN pnpm --filter @rocket/realtime-service build
# Self-contained, production-only bundle (no dev deps, no other workspace apps).
RUN pnpm --filter @rocket/realtime-service deploy --prod --legacy /app

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app
EXPOSE 3004
CMD ["node", "dist/main.js"]
