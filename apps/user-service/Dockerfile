# User Service — multi-stage, monorepo-aware, Prisma 7.
# Build context MUST be the repo root:  docker build -f apps/user-service/Dockerfile .
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
# bcrypt is a native module; node-pre-gyp fetches a musl prebuilt when
# available and otherwise compiles from source. Keep the toolchain so the
# build is robust either way — it stays in the build stage, never shipped.
RUN apk add --no-cache python3 make g++
RUN corepack enable
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
# Self-contained, production-only bundle (no dev deps, no other workspace apps).
RUN pnpm --filter @rocket/user-service deploy --prod --legacy /app

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app
EXPOSE 3001
# Apply pending migrations, then start. `migrate deploy` is idempotent.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
