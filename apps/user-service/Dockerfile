# User Service — multi-stage, monorepo-aware, Prisma 7.
# Build context MUST be the repo root:  docker build -f apps/user-service/Dockerfile .
# (or via the root docker-compose.yml which sets `context: .`)

# ---------- base ----------
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl is required by Prisma; bcrypt builds against system libs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---------- deps + build ----------
FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/user-service ./apps/user-service
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rocket/contracts build
# Prisma 7: generate the client into src/generated/prisma before compiling.
# prisma.config.ts resolves DATABASE_URL at load time, so a placeholder is
# required even though `generate` never connects to a database.
RUN cd apps/user-service \
  && DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
     pnpm exec prisma generate
RUN pnpm --filter @rocket/user-service build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/user-service
EXPOSE 3001
# Apply pending migrations, then start. `migrate deploy` is idempotent.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
