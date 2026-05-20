# API Gateway — multi-stage, monorepo-aware.
# Build context MUST be the repo root:  docker build -f apps/gateway/Dockerfile .
# (or via the root docker-compose.yml which sets `context: .`)

# ---------- base ----------
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---------- deps + build ----------
FROM base AS build
# Workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/gateway ./apps/gateway
RUN pnpm install --frozen-lockfile
# Build shared packages then the gateway.
RUN pnpm --filter @rocket/contracts --filter @rocket/redis build
RUN pnpm --filter @rocket/gateway build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/gateway
EXPOSE 3000
CMD ["node", "dist/main.js"]
