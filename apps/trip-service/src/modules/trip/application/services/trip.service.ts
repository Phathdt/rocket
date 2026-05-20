import { Logger } from '@nestjs/common';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../../domain/entities/trip.entity';
import type { TripFilters } from '../../domain/interfaces/trip-repository';
import { ITripRepository } from '../../domain/interfaces/trip-repository';
import { IDriverClient } from '../../domain/interfaces/driver-client';
import { ITripEventsPublisher } from '../../domain/interfaces/trip-events-publisher';
import {
  TripNotFoundException,
  TripCannotStartException,
  TripCannotCompleteException,
  TripCannotCancelException,
} from '../../domain/errors';

export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    private readonly tripRepository: ITripRepository,
    private readonly driverClient: IDriverClient,
    private readonly publisher: ITripEventsPublisher,
  ) {}

  async findById(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findById(id);
    if (!trip) throw new TripNotFoundException(id);
    return trip;
  }

  async findMany(filters: TripFilters): Promise<Trip[]> {
    return this.tripRepository.findMany(filters);
  }

  async startTrip(id: string): Promise<Trip> {
    const trip = await this.findById(id);

    if (trip.status !== TripStatus.ASSIGNED) {
      throw new TripCannotStartException(trip.status);
    }

    const updated = await this.tripRepository.update(id, { status: TripStatus.ONGOING });

    await this.publisher.publish({
      type: 'trip',
      tripId: id,
      passengerId: trip.passengerId,
      driverId: trip.driverId ?? undefined,
      status: TripStatus.ONGOING,
    });

    this.logger.log(`Trip ${id} started`);
    return updated;
  }

  async completeTrip(id: string): Promise<Trip> {
    const trip = await this.findById(id);

    if (trip.status !== TripStatus.ONGOING) {
      throw new TripCannotCompleteException(trip.status);
    }

    const updated = await this.tripRepository.update(id, { status: TripStatus.COMPLETED });

    if (trip.driverId) {
      await this.driverClient.release(trip.driverId);
    }

    await this.publisher.publish({
      type: 'trip',
      tripId: id,
      passengerId: trip.passengerId,
      driverId: trip.driverId ?? undefined,
      status: TripStatus.COMPLETED,
    });

    this.logger.log(`Trip ${id} completed`);
    return updated;
  }

  async cancelTrip(id: string): Promise<Trip> {
    const trip = await this.findById(id);

    const cancellableStatuses: string[] = [
      TripStatus.REQUESTED,
      TripStatus.ASSIGNED,
      TripStatus.ONGOING,
      TripStatus.NO_DRIVER,
    ];

    if (!cancellableStatuses.includes(trip.status)) {
      throw new TripCannotCancelException(trip.status);
    }

    const updated = await this.tripRepository.update(id, { status: TripStatus.CANCELLED });

    if (trip.driverId && (trip.status === TripStatus.ASSIGNED || trip.status === TripStatus.ONGOING)) {
      await this.driverClient.release(trip.driverId);
    }

    await this.publisher.publish({
      type: 'trip',
      tripId: id,
      passengerId: trip.passengerId,
      driverId: trip.driverId ?? undefined,
      status: TripStatus.CANCELLED,
    });

    this.logger.log(`Trip ${id} cancelled`);
    return updated;
  }
}
