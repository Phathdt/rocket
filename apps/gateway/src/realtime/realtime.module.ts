import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@rocket/redis';
import { RealtimeGateway } from './realtime.gateway';
import { RedisSubscriberService } from './redis-subscriber.service';
import { TripDriverMap } from './trip-driver.map';

@Module({
  imports: [
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-super-secret-change-me',
    }),
  ],
  providers: [RealtimeGateway, RedisSubscriberService, TripDriverMap],
})
export class RealtimeModule {}
