import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { DATABASE_CONNECTION_STRING } from './database.constants';

import { PrismaClient } from '../../generated/prisma/client';

/**
 * Thin NestJS wrapper around Prisma's generated client.
 *
 * The connection string is injected via DI so the same service can be reused
 * with different DSNs in integration tests. The target Postgres schema is
 * derived from the `?schema=` query param and applied through the pg
 * driver-adapter's search_path (Prisma 7 dropped inline datasource URLs).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(DATABASE_CONNECTION_STRING) connectionString: string) {
    const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';
    super({
      adapter: new PrismaPg({ connectionString }, { schema }),
      log: [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
