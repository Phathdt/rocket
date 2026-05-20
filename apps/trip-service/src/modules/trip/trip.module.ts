import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { PrismaService } from '../prisma/prisma.service';

import { ITripRepository } from './domain/interfaces/trip-repository';
import { ITripService } from './domain/interfaces/trip-service';
import { IMatchingService } from './domain/interfaces/matching-service';
import { IDriverClient } from './domain/interfaces/driver-client';
import { ITripEventsPublisher } from './domain/interfaces/trip-events-publisher';

import { TripService } from './application/services/trip.service';
import { MatchingService } from './application/services/matching.service';

import { TripPrismaRepository } from './infrastructure/repositories/trip.prisma-repository';
import { HttpDriverClient } from './infrastructure/clients/http-driver.client';
import { RedisTripEventsPublisher } from './infrastructure/events/redis-trip-events.publisher';

import { TripController } from './presentation/trip.controller';

@Module({
  imports: [HttpModule],
  controllers: [TripController],
  providers: [
    {
      provide: ITripRepository,
      useFactory: (prisma: PrismaService) => new TripPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: IDriverClient,
      useFactory: (http: HttpService, config: ConfigService) => {
        const baseUrl = config.get<string>('DRIVER_SERVICE_URL', 'http://localhost:3002');
        return new HttpDriverClient(http, baseUrl);
      },
      inject: [HttpService, ConfigService],
    },
    {
      provide: ITripEventsPublisher,
      useFactory: (redis: RedisClient) => new RedisTripEventsPublisher(redis),
      inject: [REDIS_CLIENT],
    },
    {
      provide: ITripService,
      useFactory: (repo: ITripRepository, driver: IDriverClient, pub: ITripEventsPublisher) =>
        new TripService(repo, driver, pub),
      inject: [ITripRepository, IDriverClient, ITripEventsPublisher],
    },
    {
      provide: IMatchingService,
      useFactory: (repo: ITripRepository, driver: IDriverClient, pub: ITripEventsPublisher) =>
        new MatchingService(repo, driver, pub),
      inject: [ITripRepository, IDriverClient, ITripEventsPublisher],
    },
  ],
})
export class TripModule {}
