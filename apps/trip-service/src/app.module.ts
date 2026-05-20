import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@rocket/redis';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TripModule } from './modules/trip/trip.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot(),
    PrismaModule,
    TripModule,
  ],
})
export class AppModule {}
