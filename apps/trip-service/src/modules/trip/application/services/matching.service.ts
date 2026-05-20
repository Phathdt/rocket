import { Logger } from '@nestjs/common';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../../domain/entities/trip.entity';
import type { RequestTripInput } from '../../domain/interfaces/matching-service';
import { ITripRepository } from '../../domain/interfaces/trip-repository';
import { IDriverClient } from '../../domain/interfaces/driver-client';
import { ITripEventsPublisher } from '../../domain/interfaces/trip-events-publisher';

export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly tripRepository: ITripRepository,
    private readonly driverClient: IDriverClient,
    private readonly publisher: ITripEventsPublisher,
  ) {}

  async requestTrip(input: RequestTripInput): Promise<Trip> {
    // Step 1: persist trip as REQUESTED
    const trip = await this.tripRepository.create({
      passengerId: input.passengerId,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      dropoffLat: input.dropoffLat,
      dropoffLng: input.dropoffLng,
      status: TripStatus.REQUESTED,
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
      const updated = await this.tripRepository.update(trip.id, {
        status: TripStatus.ASSIGNED,
        driverId: assignedDriverId,
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
    const updated = await this.tripRepository.update(trip.id, {
      status: TripStatus.NO_DRIVER,
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
