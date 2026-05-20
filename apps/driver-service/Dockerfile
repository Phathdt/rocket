# Driver Service — multi-stage, monorepo-aware, Prisma 7.
# Build context MUST be the repo root:  docker build -f apps/driver-service/Dockerfile .
# (or via the root docker-compose.yml which sets `context: .`)

# ---------- base ----------
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---------- deps + build ----------
FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/driver-service ./apps/driver-service
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rocket/contracts --filter @rocket/redis build
# Prisma 7: generate the client into src/generated/prisma before compiling.
RUN cd apps/driver-service && pnpm exec prisma generate
RUN pnpm --filter @rocket/driver-service build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/driver-service
EXPOSE 3002
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
