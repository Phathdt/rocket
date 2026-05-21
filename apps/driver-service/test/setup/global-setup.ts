import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { GlobalSetupContext } from 'vitest/node';

let pg: StartedPostgreSqlContainer;
let redis: StartedRedisContainer;

export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  [pg, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine').start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);
  const databaseUrl = pg.getConnectionUri(); // driver-service uses the default public schema
  execSync('pnpm exec prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  provide('databaseUrl', databaseUrl);
  provide('redisUrl', redis.getConnectionUrl());
}

export async function teardown(): Promise<void> {
  await Promise.all([pg?.stop(), redis?.stop()]);
}
