import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { MatchingService } from './matching.service';
import { DriverClient } from './driver.client';
import { TripEventsPublisher } from './trip-events.publisher';

@Module({
  imports: [HttpModule],
  controllers: [TripsController],
  providers: [TripsService, MatchingService, DriverClient, TripEventsPublisher],
})
export class TripsModule {}
