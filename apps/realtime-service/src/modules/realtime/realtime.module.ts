import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { REDIS_CLIENT, RedisModule } from '@rocket/redis';
import type { RedisClient } from '@rocket/redis';
import { RealtimeGateway } from './presentation/realtime.gateway';
import { RedisSubscriberService } from './infrastructure/redis-subscriber.service';
import { TripDriverMap } from './application/services/trip-driver-map';
import { IRealtimeGateway } from './domain/interfaces/realtime-gateway.interface';
import { ITripDriverMap } from './domain/interfaces/trip-driver-map.interface';

/**
 * Provider wiring strategy:
 * - RealtimeGateway: plain class provider so NestJS WS SocketModule can discover
 *   it (useFactory sets isNotMetatype=true which the WS scanner filters out).
 *   It carries @Injectable() + @WebSocketGateway() — the WS-controller equivalent.
 * - All other providers: useFactory + abstract-class tokens (no @Injectable).
 */
@Module({
  imports: [
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-super-secret-change-me',
    }),
  ],
  providers: [
    // RealtimeGateway — plain class provider; NestJS DI resolves JwtService from JwtModule.
    // Must NOT use useFactory here: WS SocketModule skips providers where isNotMetatype=true.
    RealtimeGateway,

    // IRealtimeGateway abstract token → aliases the singleton RealtimeGateway instance.
    {
      provide: IRealtimeGateway,
      useExisting: RealtimeGateway,
    },

    // TripDriverMap — no deps, plain instantiation via useFactory.
    {
      provide: ITripDriverMap,
      useFactory: () => new TripDriverMap(),
    },

    // RedisSubscriberService — depends on REDIS_CLIENT, IRealtimeGateway, ITripDriverMap.
    {
      provide: RedisSubscriberService,
      useFactory: (
        redis: RedisClient,
        gateway: IRealtimeGateway,
        tripDriverMap: ITripDriverMap,
      ) => new RedisSubscriberService(redis, gateway, tripDriverMap),
      inject: [REDIS_CLIENT, IRealtimeGateway, ITripDriverMap],
    },
  ],
})
export class RealtimeModule {}
