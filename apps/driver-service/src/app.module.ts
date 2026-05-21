import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@rocket/redis';
import { DriverModule } from './modules/driver/driver.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RedisModule.forRoot(),
    PrismaModule,
    DriverModule,
  ],
})
export class AppModule {}
