import { Module } from '@nestjs/common';
import { ClientGrpc, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { DRIVER_PROTO_PATH } from '@rocket/proto';
import { PrismaService } from '../prisma/prisma.service';

import { ITripRepository } from './domain/interfaces/trip-repository';
import { ITripService } from './domain/interfaces/trip-service';
import { IMatchingService } from './domain/interfaces/matching-service';
import { IDriverClient } from './domain/interfaces/driver-client';
import { ITripEventsPublisher } from './domain/interfaces/trip-events-publisher';

import { TripService } from './application/services/trip.service';
import { MatchingService } from './application/services/matching.service';

import { TripPrismaRepository } from './infrastructure/repositories/trip.prisma-repository';
import { GrpcDriverClient } from './infrastructure/clients/grpc-driver.client';
import { RedisTripEventsPublisher } from './infrastructure/events/redis-trip-events.publisher';

import { TripController } from './presentation/trip.controller';

const DRIVER_GRPC_CLIENT = 'DRIVER_GRPC_CLIENT';

@Module({
  controllers: [TripController],
  providers: [
    {
      provide: ITripRepository,
      useFactory: (prisma: PrismaService) => new TripPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: DRIVER_GRPC_CLIENT,
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.GRPC,
          options: {
            package: 'rocket.driver.v1',
            protoPath: DRIVER_PROTO_PATH,
            url: process.env.DRIVER_GRPC_URL ?? 'localhost:50051',
          },
        }),
    },
    {
      provide: IDriverClient,
      useFactory: (grpcClient: ClientGrpc) => new GrpcDriverClient(grpcClient),
      inject: [DRIVER_GRPC_CLIENT],
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
