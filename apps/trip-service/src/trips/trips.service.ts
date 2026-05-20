import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverClient } from './driver.client';
import { TripEventsPublisher } from './trip-events.publisher';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../generated/prisma/client';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverClient: DriverClient,
    private readonly publisher: TripEventsPublisher,
  ) {}

  async findById(id: string): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async findMany(filters: { passengerId?: string; driverId?: string }): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        ...(filters.passengerId ? { passengerId: filters.passengerId } : {}),
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startTrip(id: string): Promise<Trip> {
    const trip = await this.findById(id);

    if (trip.status !== TripStatus.ASSIGNED) {
      throw new ConflictException(
        `Cannot start trip in status ${trip.status}. Expected ASSIGNED.`,
      );
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: TripStatus.ONGOING },
    });

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
      throw new ConflictException(
        `Cannot complete trip in status ${trip.status}. Expected ONGOING.`,
      );
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: TripStatus.COMPLETED },
    });

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
      throw new ConflictException(
        `Cannot cancel trip in status ${trip.status}.`,
      );
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: TripStatus.CANCELLED },
    });

    // Release driver only if one was assigned
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
