import { execSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { GlobalSetupContext } from 'vitest/node';

let container: StartedPostgreSqlContainer;

/**
 * Starts a throwaway Postgres container once for the whole test run and
 * applies the Prisma schema to it. The connection string is published via
 * vitest's `provide` so every test file can `inject('databaseUrl')`.
 */
export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  // user-service maps its model to the dedicated `user` Postgres schema.
  const databaseUrl = `${container.getConnectionUri()}?schema=user`;

  execSync('pnpm exec prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  provide('databaseUrl', databaseUrl);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
