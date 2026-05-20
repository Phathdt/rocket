import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@rocket/redis';
import { PrismaModule } from './prisma/prisma.module';
import { DriversModule } from './drivers/drivers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot(),
    PrismaModule,
    DriversModule,
  ],
})
export class AppModule {}
