# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Rocket — a Grab-like ride-hailing microservices demo. A passenger requests a
trip A→B; the system matches the nearest driver via Redis GEO; the passenger
tracks the driver live over WebSocket.

## Monorepo

Turborepo + pnpm workspace.

- `apps/` — `user-service`, `driver-service`, `trip-service`, `realtime-service`
  (NestJS), `web-passenger`, `web-driver` (Vite/React), `driver-simulator` (CLI).
- `packages/` — `contracts` (Zod schemas/enums/events), `redis` (ioredis wrapper
  - NestJS module), `tsconfig`.
- `infra/traefik/` — Traefik edge-proxy config.

## Commands

- `pnpm dev` — all backend services + frontends
- `pnpm build` · `pnpm type-check` · `pnpm test`
- `pnpm lint` (oxlint) · `pnpm format` (oxfmt)
- `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:seed:online`
- Prisma CLI: run from inside the service dir — `cd apps/<svc> && pnpm exec prisma ...`.
  Do NOT run `npx prisma` from the repo root (it crashes on a broken transitive dep).

## Architecture

- **Traefik** (`:80`) is the single entry point — routes REST (`/auth` `/users`
  `/drivers` `/trips`) + `/socket.io`; CORS middleware; JWT via `ForwardAuth`
  middleware → `user-service` `GET /auth/verify`. There is no NestJS gateway.
- Backend: user `:3001`, driver `:3002`, trip `:3003`, realtime `:3004`.
- One Postgres DB `rocket` with 3 schemas (`user`/`driver`/`trip`) — schema per
  service, each with its own Prisma client + migrations. Redis: GEO matching +
  Pub/Sub events + presence TTL.
- Inter-service: REST (wrapped in thin client classes for a future gRPC swap) +
  Redis Pub/Sub (realtime-service subscribes, broadcasts to room `trip:<id>`).

## Conventions — IMPORTANT

- **Clean architecture** per module: `src/modules/<name>/{application,domain,infrastructure,presentation}`.
  - `domain/interfaces` = `abstract class` (used as DI tokens).
  - `domain/entities` = plain interfaces — never import Prisma types.
- **No `@Injectable()`** anywhere. Every provider is wired explicitly in the
  module via `useFactory` + `inject` using the abstract-class tokens. The only
  decorated classes are `@Controller` and `@WebSocketGateway` (framework needs
  them) — and a `@Cron` method works on a `useFactory`-wired class.
- **Zod contracts** live in `packages/contracts`, shared FE/BE; the backend
  validates with `nestjs-zod`. Use the `DriverStatus` / `TripStatus` / `UserRole`
  enums — never hardcode status/role string literals.
- **Prisma 7** — `prisma-client` generator (output `src/generated/prisma`); the
  datasource `url` lives in `prisma.config.ts` (not in `schema.prisma`); requires
  the `@prisma/adapter-pg` driver adapter; `PrismaService` uses composition, not
  `extends PrismaClient`. DB columns are snake_case via `@map`/`@@map`; Prisma
  field names stay camelCase.

## Gotchas

- Host ports: Postgres `55432`, Redis `56379` (the standard `5432`/`6379` are
  taken locally). Keep `.env` `DATABASE_URL` / `REDIS_URL` in sync.
- Build output: keep ALL source under `src/`. A root-level `.ts` (e.g.
  `prisma.config.ts`) leaking into a build `include` makes `tsc` emit
  `dist/src/main.js` and breaks the `start` script — set `rootDir: src`.
- Ghost drivers: `findNearby` filters GEO candidates by the Redis presence key;
  `LivenessSweeper` (`@nestjs/schedule` `@Cron`) GCs stale GEO-set members.

## Code quality

`oxlint` (`.oxlintrc.json`) + `oxfmt` (`.oxfmtrc.json`). `lefthook` `pre-commit`
runs format + lint + test; auto-installed via the `prepare` script.
