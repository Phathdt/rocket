/**
 * User Service seed — idempotent.
 *
 * Creates demo accounts for the ride-hailing demo:
 *   - 2 passengers   (role PASSENGER)
 *   - 5 driver users (role DRIVER)  -> linked later by driver-service seed
 *
 * All accounts use the password `password`. Re-running is safe (upsert by email).
 *
 * Run: cd apps/user-service && pnpm db:seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DEFAULT_PASSWORD = 'password';
const BCRYPT_SALT_ROUNDS = 10;

interface SeedUser {
  email: string;
  name: string;
  role: 'PASSENGER' | 'DRIVER';
}

const PASSENGERS: SeedUser[] = [
  { email: 'passenger1@rocket.dev', name: 'Passenger One', role: 'PASSENGER' },
  { email: 'passenger2@rocket.dev', name: 'Passenger Two', role: 'PASSENGER' },
];

const DRIVER_USERS: SeedUser[] = [
  { email: 'sim-driver-1@rocket.dev', name: 'Sim Driver 1', role: 'DRIVER' },
  { email: 'sim-driver-2@rocket.dev', name: 'Sim Driver 2', role: 'DRIVER' },
  { email: 'sim-driver-3@rocket.dev', name: 'Sim Driver 3', role: 'DRIVER' },
  { email: 'sim-driver-4@rocket.dev', name: 'Sim Driver 4', role: 'DRIVER' },
  { email: 'sim-driver-5@rocket.dev', name: 'Sim Driver 5', role: 'DRIVER' },
];

function buildClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // Mirror PrismaService: strip ?schema= and set search_path on the pg Pool.
  const url = new URL(connectionString);
  const schema = url.searchParams.get('schema') ?? 'public';
  url.search = '';
  const pool = new Pool({
    connectionString: url.toString(),
    options: `-c search_path=${schema}`,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main(): Promise<void> {
  const prisma = buildClient();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);

  try {
    for (const u of [...PASSENGERS, ...DRIVER_USERS]) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role },
        create: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
        },
      });
      console.log(`  upserted user ${u.email} (${u.role})`);
    }
    const total = await prisma.user.count();
    console.log(`user-service seed done — ${total} users total`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('user-service seed failed:', err);
  process.exit(1);
});
