import { Module } from '@nestjs/common';
import { REDIS_CLIENT } from '@rocket/redis';
import type { RedisClient as Redis } from '@rocket/redis';
import { PrismaService } from '../prisma/prisma.service';
import { DriverService } from './application/services/driver.service';
import { IDriverRepository } from './domain/interfaces/driver.repository';
import { IDriverService } from './domain/interfaces/driver.service';
import { IGeoRepository } from './domain/interfaces/geo.repository';
import { DriverEventsPublisher } from './infrastructure/events/driver-events.publisher';
import { RedisGeoRepository } from './infrastructure/geo/redis-geo.repository';
import { DriverPrismaRepository } from './infrastructure/repositories/driver.prisma-repository';
import { DriverController } from './presentation/driver.controller';

@Module({
  controllers: [DriverController],
  providers: [
    {
      provide: DriverEventsPublisher,
      useFactory: (redis: Redis) => new DriverEventsPublisher(redis),
      inject: [REDIS_CLIENT],
    },
    {
      provide: IDriverRepository,
      useFactory: (prisma: PrismaService) => new DriverPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: IGeoRepository,
      useFactory: (redis: Redis, events: DriverEventsPublisher) =>
        new RedisGeoRepository(redis, events),
      inject: [REDIS_CLIENT, DriverEventsPublisher],
    },
    {
      provide: IDriverService,
      useFactory: (repo: IDriverRepository, geo: IGeoRepository) =>
        new DriverService(repo, geo),
      inject: [IDriverRepository, IGeoRepository],
    },
  ],
  exports: [IDriverService],
})
export class DriverModule {}
