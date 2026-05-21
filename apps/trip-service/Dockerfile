# Trip Service — multi-stage, monorepo-aware, Prisma 7.
# Build context MUST be the repo root:  docker build -f apps/trip-service/Dockerfile .
# (or via the root docker-compose.yml which sets `context: .`)

# ---------- base ----------
# Alpine is ~5x smaller than Debian slim. openssl is required by the Prisma
# schema engine, used at container start by `prisma migrate deploy`.
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /repo

# ---------- deps + build ----------
FROM base AS build
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/trip-service ./apps/trip-service
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rocket/contracts --filter @rocket/redis build
# Prisma 7: generate the client into src/generated/prisma before compiling.
RUN cd apps/trip-service && pnpm exec prisma generate
RUN pnpm --filter @rocket/trip-service build
# Self-contained, production-only bundle (no dev deps, no other workspace apps).
RUN pnpm --filter @rocket/trip-service deploy --prod --legacy /app

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app
EXPOSE 3003
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
