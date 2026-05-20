import { Global, Module } from '@nestjs/common';

import { DATABASE_CONNECTION_STRING } from './database.constants';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION_STRING,
      useFactory: (): string => {
        const url = process.env['DATABASE_URL'];
        if (!url) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        return url;
      },
    },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
