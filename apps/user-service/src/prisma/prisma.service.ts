import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Strip the ?schema= query param from the URL before passing to pg Pool.
    // pg uses `options` with search_path to set the active schema.
    const url = new URL(connectionString);
    const schema = url.searchParams.get('schema') ?? 'public';
    url.search = '';

    const pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema}`,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
