# Rocket — Ride-Hailing Microservices Demo

A Grab-like ride-hailing system built to **demo and learn microservices architecture**.
A passenger requests a trip A → B, the system finds the nearest available driver
(Redis GEO matching), and the passenger tracks the driver's location live over
WebSocket.

---

## Architecture

```
                          ┌──────────────────────────┐
                          │        Frontend          │
                          │  web-passenger   :5173    │
                          │  web-driver      :5174    │
                          └────────────┬─────────────┘
                                       │ REST + WebSocket (Socket.IO)
                                       ▼
                          ┌──────────────────────────┐
                          │     Traefik edge   :80    │
                          │  - single entry point     │
                          │  - REST routing / LB      │
                          │  - CORS middleware        │
                          │  - JWT ForwardAuth        │
                          │  - /socket.io → realtime  │
                          │  dashboard          :8080 │
                          └──┬────────┬────────┬──────┬┘
                             │        │        │      │
              ┌──────────────┘        │        │      └──────────────┐
              ▼                       ▼        ▼                     ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │  User Service :3001│  │ Driver Service:3002│  │  Trip Service :3003│  │ Realtime Svc  :3004│
   │  - register/login  │  │  - driver profiles │  │  - trip lifecycle  │  │  - Socket.IO hub   │
   │  - JWT issuer      │  │  - Redis GEO match │  │  - matching engine │  │  - room trip:<id>  │
   │  - /auth/verify    │  │  - online presence │  │  - calls Driver Svc│  │  - Redis Pub/Sub   │
   │    (ForwardAuth)   │  │  - location updates│  │    to assign driver│  │    subscriber      │
   └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
             │ schema=user           │ schema=driver         │ schema=trip            │
             └───────────────┬───────┴───────────────┬───────┘                       │
                             ▼                       ▼◄──────────────────────────────┘
                  ┌────────────────────┐  ┌────────────────────┐
                  │   PostgreSQL 16    │  │      Redis 7       │
                  │  one DB `rocket`,  │  │  - GEO matching    │
                  │  3 schemas:        │  │  - Pub/Sub events  │
                  │  user/driver/trip  │  │  - presence (TTL)  │
                  └────────────────────┘  └────────────────────┘
```

**Edge proxy (Traefik)**

Traefik is the single public entry point on `:80`. It routes REST path prefixes
(`/auth` `/users` `/drivers` `/trips`) to the backend services and `/socket.io`
to the Realtime Service. CORS is handled by a Traefik middleware. Protected
routes (`/users` `/drivers` `/trips`) go through a `ForwardAuth` middleware that
calls `user-service` `/auth/verify` to validate the JWT; `/auth` is public.

**Inter-service communication**

- **Synchronous:** **gRPC** for Trip Service → Driver Service (`findNearby` /
  `assign` / `release`) — proto contract in `packages/proto`. Driver Service is a
  hybrid app: REST `:3002` for the frontend, gRPC `:50051` for Trip Service. The
  call sits behind the `IDriverClient` interface, so the transport is swappable.
- **Asynchronous:** Redis Pub/Sub. Services publish trip/driver events; the
  Realtime Service subscribes and broadcasts them to the WebSocket room
  `trip:<id>`.

**Trip lifecycle:** `REQUESTED → ASSIGNED → ONGOING → COMPLETED`
(plus `CANCELLED` and `NO_DRIVER`).

### Tech stack

| Layer    | Tech                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| Edge     | Traefik v3 (routing · LB · CORS · JWT ForwardAuth)                                    |
| Backend  | NestJS 11 · Prisma 7 · PostgreSQL 16 · Redis 7 (ioredis) · Socket.IO 4 · `nestjs-zod` |
| Frontend | Vite + React 19 · TailwindCSS + shadcn/ui · TanStack React Query 5 · Axios · Leaflet  |
| Shared   | Zod contracts (`packages/contracts`) · Turborepo 2 · pnpm workspace                   |
| Tooling  | oxlint (lint) · oxfmt (format) · lefthook (git hooks)                                 |

---

## Prerequisites

- **Node.js 22+**
- **pnpm 9+** (repo pins `pnpm@10.30.3` via `packageManager`; `corepack enable` picks it up)
- **Docker** + Docker Compose v2

---

## Ports

| Service             | Port    | Notes                                        |
| ------------------- | ------- | -------------------------------------------- |
| Traefik (edge)      | 80      | single public entry point (REST + WebSocket) |
| Traefik dashboard   | 8080    | routing/health UI                            |
| User Service        | 3001    | internal (`/auth` `/users`)                  |
| Driver Service      | 3002    | internal (`/drivers` REST)                   |
| Driver Service gRPC | 50051   | internal (gRPC, called by Trip Service)      |
| Trip Service        | 3003    | internal (`/trips`)                          |
| Realtime Service    | 3004    | internal (`/socket.io` WebSocket hub)        |
| web-passenger       | 5173    | Vite dev server                              |
| web-driver          | 5174    | Vite dev server                              |
| PostgreSQL          | 55432\* | host port, set by `POSTGRES_HOST_PORT`       |
| Redis               | 56379\* | host port, set by `REDIS_HOST_PORT`          |

\* `.env.example` defaults Postgres/Redis to host ports `55432`/`56379` to avoid
clashing with any local Postgres/Redis on the standard `5432`/`6379`. Inside the
Docker network the standard `5432`/`6379` are still used. To change the host
ports, edit `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` and keep `DATABASE_URL` /
`REDIS_URL` in sync.

---

## Quick start

Traefik (edge proxy) always runs in Docker — it is the single entry point on
`:80` and reaches the backend services via `host.docker.internal`.

There are two ways to run the backend. **Path A (recommended for development)**
runs Traefik + infra in Docker and the apps via `pnpm dev` — fast reloads, easy
debugging. **Path B** runs the 4 backend services in Docker too.

The frontend apps are always run with `pnpm dev` (Vite).

### 0. Setup

```bash
cp .env.example .env          # then adjust ports if 5432/6379 are taken
pnpm install
```

### Path A — Traefik + infra in Docker, apps via pnpm (recommended)

```bash
# 1. Start Traefik + Postgres + Redis
docker compose up -d

# 2. Apply database migrations (user / driver / trip schemas)
pnpm db:migrate

# 3. Seed demo accounts: 2 passengers + 5 drivers (idempotent)
pnpm db:seed

# 4. Start all 4 backend services + 2 frontend apps
pnpm dev

# 5. (optional) Bring the 5 seeded drivers ONLINE around District 1, HCMC
#    so a passenger can be matched immediately. Run after `pnpm dev` is up.
pnpm db:seed:online
```

The 4 backend services (user / driver / trip / realtime) are reached through
Traefik on <http://localhost>; the Traefik dashboard is at <http://localhost:8080>.

### Path B — Everything in Docker

```bash
# Builds + runs the 4 backend services AND Traefik + Postgres + Redis.
# The 3 Prisma services run `prisma migrate deploy` on startup.
docker compose --profile backend up -d --build

# Seed demo data (run from the host against the containers)
pnpm db:seed
pnpm db:seed:online

# Frontend still runs locally:
pnpm --filter @rocket/web-passenger dev
pnpm --filter @rocket/web-driver dev
```

Open:

- Passenger app → <http://localhost:5173>
- Driver app → <http://localhost:5174>

---

## Demo walkthrough

After `pnpm db:seed` the following accounts exist (password is `password` for all):

| Email                                                 | Role                |
| ----------------------------------------------------- | ------------------- |
| `passenger1@rocket.dev`                               | PASSENGER           |
| `passenger2@rocket.dev`                               | PASSENGER           |
| `sim-driver-1@rocket.dev` … `sim-driver-5@rocket.dev` | DRIVER (5 accounts) |

**Fastest demo (using `db:seed:online`):**

1. Run `pnpm db:seed:online` — the 5 drivers go ONLINE around District 1, HCMC
   (`~10.7769, 106.7009`).
2. Open the **passenger app** (<http://localhost:5173>), log in as
   `passenger1@rocket.dev` / `password`.
3. Pick a pickup near District 1 and a destination, request the trip.
4. The system matches the nearest driver — the trip moves to `ASSIGNED`.
5. Open the **driver app** (<http://localhost:5174>), log in as the matched
   `sim-driver-N@rocket.dev`, accept the trip and "drive".
6. Watch the driver marker move live on the passenger map until `COMPLETED`.

**Fully manual demo (no `db:seed:online`):**

1. Open the **driver app**, log in as `sim-driver-1@rocket.dev` / `password`.
2. Go **online** — the driver appears in the Redis GEO set.
3. Open the **passenger app**, log in as `passenger1@rocket.dev`.
4. Request a trip near the driver's location → it matches → driver accepts →
   passenger sees the live driver marker → trip completes.

---

## Useful commands

| Command                                          | Description                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `pnpm dev`                                       | run all 4 backend services + 2 frontend apps (Turbo)                      |
| `pnpm build`                                     | build all packages and apps                                               |
| `pnpm lint`                                      | lint all source with oxlint                                               |
| `pnpm format`                                    | format all source with oxfmt (`pnpm format:check` to verify)              |
| `pnpm test`                                      | run the test suite across all services (Turbo)                            |
| `pnpm db:migrate`                                | apply Prisma migrations for every service                                 |
| `pnpm db:seed`                                   | seed users then drivers (sequential, idempotent)                          |
| `pnpm db:seed:online`                            | set the 5 seeded drivers ONLINE + located (calls Driver Service REST API) |
| `pnpm type-check`                                | type-check every package                                                  |
| `docker compose up -d`                           | start Traefik + Postgres + Redis                                          |
| `docker compose --profile backend up -d --build` | start edge + infra + 4 backend services                                   |
| `docker compose down -v`                         | stop everything and wipe DB/Redis volumes                                 |

---

## Code quality

- **Lint** — `oxlint` (config `.oxlintrc.json`): `pnpm lint`.
- **Format** — `oxfmt` (config `.oxfmtrc.json`, Prettier-compatible): `pnpm format`.
- **Git hooks** — `lefthook` (config `lefthook.yml`): the `pre-commit` hook runs
  format + lint (on staged files) + the test suite. Installed automatically by
  the `prepare` script on `pnpm install`.

Backend services follow a **clean architecture** layout — each domain is a
module under `src/modules/<name>/` split into `application/` (use-case
services), `domain/` (entities, Zod DTOs, errors, abstract-class interfaces),
`infrastructure/` (Prisma repositories, Redis, external clients) and
`presentation/` (REST controllers). Providers are wired explicitly in the
module via `useFactory`.

---

## Project layout

```
apps/
  user-service/     auth, JWT, users, /auth/verify (ForwardAuth)
  driver-service/   driver profiles, Redis GEO matching
  trip-service/     trip lifecycle, matching engine
  realtime-service/ Socket.IO hub — Redis Pub/Sub subscriber, room trip:<id>
  driver-simulator/ scripted drivers that go online and move (demo helper)
  web-passenger/    Vite React app — passenger
  web-driver/       Vite React app — driver
infra/
  traefik/          edge proxy config — routers / services / middlewares
packages/
  contracts/        Zod schemas + inferred types + enums + event names (shared FE/BE)
  redis/            ioredis wrapper + NestJS module
  tsconfig/         shared TypeScript configs
scripts/
  seed-drivers-online.ts   bring seeded drivers online via the Driver Service API
```

---

## Database

One PostgreSQL database `rocket` with **three schemas** — `user`, `driver`,
`trip` — one per service. Each service owns its schema, has its own Prisma
schema and migrations, and connects with `?schema=<name>` in `DATABASE_URL`.

Prisma 7 is used (the Rust-free `prisma-client` generator). To run the Prisma
CLI for a service, do it from inside that service's directory, e.g.:

```bash
cd apps/user-service && pnpm exec prisma migrate dev
```

---

## gRPC

The Trip Service → Driver Service call runs over **gRPC**. The proto contract
lives in `packages/proto` (`rocket.driver.v1.DriverService`); TypeScript is
generated with ts-proto. Driver Service is a hybrid app — REST `:3002` for the
frontend, gRPC `:50051` for the Trip Service. The call sits behind the
`IDriverClient` interface, so swapping transports touched only one file
(`grpc-driver.client.ts`), not the matching logic.

Other boundaries deliberately stay on REST/WebSocket: the Traefik ↔ frontend
edge (browsers don't speak gRPC) and Traefik ForwardAuth → User Service
`/auth/verify`. Async events stay on Redis Pub/Sub.
