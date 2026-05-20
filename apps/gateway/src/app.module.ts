import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { servicesConfig } from './config/services.config';
import { JwtGuard } from './auth/jwt.guard';
import { HttpProxyService } from './proxy/http-proxy.service';
import { AuthController } from './proxy/auth.controller';
import { UsersController } from './proxy/users.controller';
import { DriversController } from './proxy/drivers.controller';
import { TripsController } from './proxy/trips.controller';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [servicesConfig],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-super-secret-change-me',
    }),
    HttpModule,
    RealtimeModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    DriversController,
    TripsController,
  ],
  providers: [
    HttpProxyService,
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
