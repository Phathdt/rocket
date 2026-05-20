import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { ITripService } from '../domain/interfaces/trip-service';
import { IMatchingService } from '../domain/interfaces/matching-service';
import { CreateTripDto } from '../domain/dto/create-trip.schema';
import { MissingUserIdHeaderException } from '../domain/errors';

@Controller('trips')
export class TripController {
  constructor(
    private readonly tripService: ITripService,
    private readonly matchingService: IMatchingService,
  ) {}

  /** POST /trips — create trip and run matching */
  @Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new MissingUserIdHeaderException();
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
    return this.tripService.findMany({ passengerId, driverId });
  }

  /** GET /trips/:id */
  @Get(':id')
  async getTrip(@Param('id') id: string) {
    return this.tripService.findById(id);
  }

  /** POST /trips/:id/start — ASSIGNED → ONGOING */
  @Post(':id/start')
  async startTrip(@Param('id') id: string) {
    return this.tripService.startTrip(id);
  }

  /** POST /trips/:id/complete — ONGOING → COMPLETED */
  @Post(':id/complete')
  async completeTrip(@Param('id') id: string) {
    return this.tripService.completeTrip(id);
  }

  /** POST /trips/:id/cancel — → CANCELLED */
  @Post(':id/cancel')
  async cancelTrip(@Param('id') id: string) {
    return this.tripService.cancelTrip(id);
  }
}
