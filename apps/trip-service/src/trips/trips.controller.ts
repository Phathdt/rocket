import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { MatchingService } from './matching.service';
import { CreateTripDto } from './dto';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly matchingService: MatchingService,
  ) {}

  /** POST /trips — create trip and run matching */
  @Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.matchingService.requestTrip({
      passengerId: userId,
      pickupLat: dto.pickup.lat,
      pickupLng: dto.pickup.lng,
      dropoffLat: dto.dropoff.lat,
      dropoffLng: dto.dropoff.lng,
    });
  }

  /** GET /trips?passengerId=&driverId= */
  @Get()
  async listTrips(
    @Query('passengerId') passengerId?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.tripsService.findMany({ passengerId, driverId });
  }

  /** GET /trips/:id */
  @Get(':id')
  async getTrip(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }

  /** POST /trips/:id/start — ASSIGNED → ONGOING */
  @Post(':id/start')
  async startTrip(@Param('id') id: string) {
    return this.tripsService.startTrip(id);
  }

  /** POST /trips/:id/complete — ONGOING → COMPLETED */
  @Post(':id/complete')
  async completeTrip(@Param('id') id: string) {
    return this.tripsService.completeTrip(id);
  }

  /** POST /trips/:id/cancel — → CANCELLED */
  @Post(':id/cancel')
  async cancelTrip(@Param('id') id: string) {
    return this.tripsService.cancelTrip(id);
  }
}
