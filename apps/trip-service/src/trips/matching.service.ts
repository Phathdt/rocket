import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverClient } from './driver.client';
import { TripEventsPublisher } from './trip-events.publisher';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../generated/prisma/client';

export interface RequestTripInput {
  passengerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverClient: DriverClient,
    private readonly publisher: TripEventsPublisher,
  ) {}

  async requestTrip(input: RequestTripInput): Promise<Trip> {
    // Step 1: persist trip as REQUESTED
    const trip = await this.prisma.trip.create({
      data: {
        passengerId: input.passengerId,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        dropoffLat: input.dropoffLat,
        dropoffLng: input.dropoffLng,
        status: TripStatus.REQUESTED,
      },
    });

    // Step 2: find nearby drivers (Driver Service may be unreachable — returns [])
    const candidates = await this.driverClient.findNearby(
      input.pickupLat,
      input.pickupLng,
      5,
      5,
    );

    this.logger.log(`Trip ${trip.id}: found ${candidates.length} nearby driver(s)`);

    // Step 3: attempt to assign first available driver (race-safe via Driver NX lock)
    let assignedDriverId: string | null = null;
    for (const candidate of candidates) {
      const result = await this.driverClient.assign(candidate.driverId);
      if (result.ok) {
        assignedDriverId = candidate.driverId;
        this.logger.log(`Trip ${trip.id}: assigned driver ${assignedDriverId}`);
        break;
      }
      this.logger.debug(`Trip ${trip.id}: driver ${candidate.driverId} lock taken, trying next`);
    }

    // Step 4: update trip status and publish event
    if (assignedDriverId) {
      const updated = await this.prisma.trip.update({
        where: { id: trip.id },
        data: { status: TripStatus.ASSIGNED, driverId: assignedDriverId },
      });

      await this.publisher.publish({
        type: 'trip',
        tripId: trip.id,
        passengerId: input.passengerId,
        driverId: assignedDriverId,
        status: TripStatus.ASSIGNED,
      });

      return updated;
    }

    // No driver found or all locks taken
    const updated = await this.prisma.trip.update({
      where: { id: trip.id },
      data: { status: TripStatus.NO_DRIVER },
    });

    await this.publisher.publish({
      type: 'trip',
      tripId: trip.id,
      passengerId: input.passengerId,
      status: TripStatus.NO_DRIVER,
    });

    return updated;
  }
}
