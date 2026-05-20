/**
 * Driver Service seed — idempotent.
 *
 * Creates 5 Driver profiles, each linked to a driver-role user created by the
 * user-service seed. Driver `userId` is resolved by reading the `user.User`
 * table (same Postgres instance, `user` schema) — so the user-service seed
 * MUST run first.
 *
 * Drivers are seeded with status OFFLINE (location lives in Redis, not here).
 * Re-running is safe (upsert by userId).
 *
 * Run: cd apps/driver-service && pnpm db:seed
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DRIVER_SCHEMA = 'driver';

interface SeedDriver {
  userEmail: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
}

const DRIVERS: SeedDriver[] = [
  {
    userEmail: 'sim-driver-1@rocket.dev',
    name: 'Sim Driver 1',
    vehiclePlate: '51A-001.01',
    vehicleModel: 'Honda Wave',
  },
  {
    userEmail: 'sim-driver-2@rocket.dev',
    name: 'Sim Driver 2',
    vehiclePlate: '51A-002.02',
    vehicleModel: 'Yamaha Sirius',
  },
  {
    userEmail: 'sim-driver-3@rocket.dev',
    name: 'Sim Driver 3',
    vehiclePlate: '51A-003.03',
    vehicleModel: 'Honda Air Blade',
  },
  {
    userEmail: 'sim-driver-4@rocket.dev',
    name: 'Sim Driver 4',
    vehiclePlate: '51A-004.04',
    vehicleModel: 'Toyota Vios',
  },
  {
    userEmail: 'sim-driver-5@rocket.dev',
    name: 'Sim Driver 5',
    vehiclePlate: '51A-005.05',
    vehicleModel: 'Mitsubishi Xpander',
  },
];

function buildPool(): Pool {
  const connectionString =
    process.env['DATABASE_URL'] ??
    'postgresql://postgres:postgres@localhost:55432/rocket?schema=driver';
  const url = new URL(connectionString);
  url.search = '';
  return new Pool({ connectionString: url.toString() });
}

async function resolveUserIds(
  pool: Pool,
  emails: string[],
): Promise<Map<string, string>> {
  const res = await pool.query<{ id: string; email: string }>(
    'SELECT id, email FROM "user"."users" WHERE email = ANY($1)',
    [emails],
  );
  return new Map(res.rows.map((r) => [r.email, r.id]));
}

async function main(): Promise<void> {
  const pool = buildPool();
  const adapter = new PrismaPg(
    { connectionString: process.env['DATABASE_URL'] },
    { schema: DRIVER_SCHEMA },
  );
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<
    typeof PrismaClient
  >[0]);

  try {
    const emails = DRIVERS.map((d) => d.userEmail);
    const userIds = await resolveUserIds(pool, emails);

    const missing = emails.filter((e) => !userIds.has(e));
    if (missing.length > 0) {
      throw new Error(
        `Driver-user accounts not found: ${missing.join(', ')}. ` +
          'Run the user-service seed first (pnpm db:seed).',
      );
    }

    for (const d of DRIVERS) {
      const userId = userIds.get(d.userEmail)!;
      await prisma.driver.upsert({
        where: { userId },
        update: {
          name: d.name,
          vehiclePlate: d.vehiclePlate,
          vehicleModel: d.vehicleModel,
        },
        create: {
          userId,
          name: d.name,
          vehiclePlate: d.vehiclePlate,
          vehicleModel: d.vehicleModel,
          status: 'OFFLINE',
        },
      });
      console.log(`  upserted driver ${d.name} (userId=${userId})`);
    }
    const total = await prisma.driver.count();
    console.log(`driver-service seed done — ${total} drivers total`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('driver-service seed failed:', err);
  process.exit(1);
});
