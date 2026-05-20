/**
 * Bring the 5 seeded drivers ONLINE around a center point — demo convenience.
 *
 * Driver location lives in Redis (not Postgres), so it cannot be seeded by a
 * Prisma seed. This script drives the *running* Driver Service REST API:
 *   1. POST /drivers/:id/status   -> ONLINE
 *   2. POST /drivers/:id/location -> a random point near the center
 *
 * Prerequisites:
 *   - Postgres + Redis up, migrations + `pnpm db:seed` already run.
 *   - Driver Service running (default http://localhost:3002).
 *
 * Run: pnpm db:seed:online
 *
 * Env overrides:
 *   DRIVER_SERVICE_URL  (default http://localhost:3002)
 *   DATABASE_URL        (default points at localhost:55432)
 *   SEED_CENTER_LAT / SEED_CENTER_LNG  (default District 1, HCMC)
 */
import 'dotenv/config';
import { Pool } from 'pg';

const DRIVER_SERVICE_URL =
  process.env['DRIVER_SERVICE_URL'] ?? 'http://localhost:3002';
const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:55432/rocket';

// District 1, Ho Chi Minh City.
const CENTER_LAT = Number(process.env['SEED_CENTER_LAT'] ?? 10.7769);
const CENTER_LNG = Number(process.env['SEED_CENTER_LNG'] ?? 106.7009);
const SPREAD_DEG = 0.015; // ~1.5 km jitter around the center.

function jitter(base: number): number {
  return base + (Math.random() * 2 - 1) * SPREAD_DEG;
}

async function getDriverIds(): Promise<{ id: string; name: string }[]> {
  const url = new URL(DATABASE_URL);
  url.search = '';
  const pool = new Pool({ connectionString: url.toString() });
  try {
    const res = await pool.query<{ id: string; name: string }>(
      'SELECT id, name FROM "driver"."drivers" ORDER BY name',
    );
    return res.rows;
  } finally {
    await pool.end();
  }
}

async function postJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${DRIVER_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} -> ${res.status}: ${text}`);
  }
}

async function main(): Promise<void> {
  const drivers = await getDriverIds();
  if (drivers.length === 0) {
    throw new Error(
      'No drivers found. Run `pnpm db:seed` before this script.',
    );
  }

  console.log(
    `Bringing ${drivers.length} driver(s) ONLINE around ` +
      `(${CENTER_LAT}, ${CENTER_LNG}) via ${DRIVER_SERVICE_URL}`,
  );

  for (const d of drivers) {
    const lat = jitter(CENTER_LAT);
    const lng = jitter(CENTER_LNG);
    // Status must be set ONLINE before a location update is accepted.
    await postJson(`/drivers/${d.id}/status`, { status: 'ONLINE' });
    await postJson(`/drivers/${d.id}/location`, { lat, lng });
    console.log(
      `  ${d.name} ONLINE @ ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    );
  }

  console.log('All drivers are ONLINE and located. Matching is ready.');
}

main().catch((err) => {
  console.error('seed-drivers-online failed:', err.message ?? err);
  process.exit(1);
});
