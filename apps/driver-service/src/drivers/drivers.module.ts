import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { GeoService } from './geo.service';
import { DriverEventsPublisher } from './driver-events.publisher';

@Module({
  controllers: [DriversController],
  providers: [DriversService, GeoService, DriverEventsPublisher],
})
export class DriversModule {}
