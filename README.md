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
                          │      API Gateway  :3000   │
                          │  - JWT verify (guard)     │
                          │  - REST reverse-proxy     │
                          │  - WebSocket hub          │
                          │    room: trip:<id>        │
                          └───┬───────┬───────┬───────┘
                              │       │       │  REST (sync)
              ┌───────────────┘       │       └───────────────┐
              ▼                       ▼                       ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │  User Service :3001│  │ Driver Service:3002│  │  Trip Service :3003│
   │  - register/login  │  │  - driver profiles │  │  - trip lifecycle  │
   │  - JWT issuer      │  │  - Redis GEO match │  │  - matching engine │
   │  - role PASSENGER/ │  │  - online presence │  │  - calls Driver Svc│
   │    DRIVER          │  │  - location updates│  │    to assign driver│
   └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
             │ schema=user           │ schema=driver         │ schema=trip
             └───────────────┬───────┴───────────────┬───────┘
                             ▼                       ▼
                  ┌────────────────────┐  ┌────────────────────┐
                  │   PostgreSQL 16    │  │      Redis 7       │
                  │  one DB `rocket`,  │  │  - GEO matching    │
                  │  3 schemas:        │  │  - Pub/Sub events  │
                  │  user/driver/trip  │  │  - presence (TTL)  │
                  └────────────────────┘  └────────────────────┘
```

**Inter-service communication**

- **Synchronous:** REST between services (e.g. Trip Service → Driver Service to
  assign a driver). Each cross-service call is wrapped in a thin client class so
  it can be swapped for gRPC later (see "Future: gRPC path").
- **Asynchronous:** Redis Pub/Sub. Services publish trip/driver events; the
  Gateway subscribes and broadcasts them to the WebSocket room `trip:<id>`.

**Trip lifecycle:** `REQUESTED → ASSIGNED → ONGOING → COMPLETED`
(plus `CANCELLED` and `NO_DRIVER`).

### Tech stack

| Layer    | Tech |
|----------|------|
| Backend  | NestJS 11 · Prisma 7 · PostgreSQL 16 · Redis 7 (ioredis) · Socket.IO 4 · `nestjs-zod` |
| Frontend | Vite + React 19 · TailwindCSS + shadcn/ui · TanStack React Query 5 · Axios · Leaflet |
| Shared   | Zod contracts (`packages/contracts`) · Turborepo 2 · pnpm workspace |

---

## Prerequisites

- **Node.js 22+**
- **pnpm 9+** (repo pins `pnpm@10.30.3` via `packageManager`; `corepack enable` picks it up)
- **Docker** + Docker Compose v2

---

## Ports

| Service           | Port  | Notes |
|-------------------|-------|-------|
| API Gateway       | 3000  | single public entry point (REST + WebSocket) |
| User Service      | 3001  | internal |
| Driver Service    | 3002  | internal |
| Trip Service      | 3003  | internal |
| web-passenger     | 5173  | Vite dev server |
| web-driver        | 5174  | Vite dev server |
| PostgreSQL        | 55432* | host port, set by `POSTGRES_HOST_PORT` |
| Redis             | 56379* | host port, set by `REDIS_HOST_PORT` |

\* `.env.example` defaults Postgres/Redis to host ports `55432`/`56379` to avoid
clashing with any local Postgres/Redis on the standard `5432`/`6379`. Inside the
Docker network the standard `5432`/`6379` are still used. To change the host
ports, edit `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` and keep `DATABASE_URL` /
`REDIS_URL` in sync.

---

## Quick start

There are two ways to run the backend. **Path A (recommended for development)**
runs only infra in Docker and the apps via `pnpm dev` — fast reloads, easy
debugging. **Path B** runs the 4 backend services in Docker too.

The frontend apps are always run with `pnpm dev` (Vite).

### 0. Setup

```bash
cp .env.example .env          # then adjust ports if 5432/6379 are taken
pnpm install
```

### Path A — Infra in Docker, apps via pnpm (recommended)

```bash
# 1. Start Postgres + Redis only
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

### Path B — Everything in Docker

```bash
# Builds + runs the 4 backend services AND Postgres + Redis.
# Each service runs `prisma migrate deploy` on startup.
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

| Email                     | Role      |
|---------------------------|-----------|
| `passenger1@rocket.dev`   | PASSENGER |
| `passenger2@rocket.dev`   | PASSENGER |
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

| Command                  | Description |
|--------------------------|-------------|
| `pnpm dev`               | run all 4 backend services + 2 frontend apps (Turbo) |
| `pnpm build`             | build all packages and apps |
| `pnpm db:migrate`        | apply Prisma migrations for every service |
| `pnpm db:seed`           | seed users then drivers (sequential, idempotent) |
| `pnpm db:seed:online`    | set the 5 seeded drivers ONLINE + located (calls Driver Service REST API) |
| `pnpm type-check`        | type-check every package |
| `docker compose up -d`   | start Postgres + Redis only |
| `docker compose --profile backend up -d --build` | start infra + 4 backend services |
| `docker compose down -v` | stop everything and wipe DB/Redis volumes |

---

## Project layout

```
apps/
  gateway/          API Gateway     — REST proxy + WebSocket hub
  user-service/     auth, JWT, users
  driver-service/   driver profiles, Redis GEO matching
  trip-service/     trip lifecycle, matching engine
  web-passenger/    Vite React app — passenger
  web-driver/       Vite React app — driver
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

## Future: gRPC path

All service-to-service calls currently go over REST, but each one is wrapped in
a thin client class (e.g. `DriverClient` in the Trip Service). Migrating to gRPC
later means swapping the implementation inside those client classes — the
calling code (controllers, services) does not change. The synchronous REST hops
between services are the natural candidates for gRPC; the Gateway ↔ frontend
boundary stays REST + WebSocket.
