import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma 7 uses composition (not inheritance) because PrismaClient is returned
 * by a factory. The datasource URL is no longer in schema.prisma — instead we
 * pass a PrismaPg adapter at construction time.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;

  constructor() {
    const connectionString =
      process.env['DATABASE_URL'] ??
      'postgresql://postgres:postgres@localhost:55432/rocket?schema=trip';

    // Pass schema so PrismaPg sets search_path=trip on every connection
    const adapter = new PrismaPg({ connectionString }, { schema: 'trip' });
    // Prisma 7: adapter is required when no url in datasource block
    this.client = new PrismaClient({ adapter });
  }

  // Expose the trip delegate so services can call this.prisma.trip.*
  get trip(): PrismaClient['trip'] {
    return this.client.trip as PrismaClient['trip'];
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    this.logger.log('Database disconnected');
  }
}
