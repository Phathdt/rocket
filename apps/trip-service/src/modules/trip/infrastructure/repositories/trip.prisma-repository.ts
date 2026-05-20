import { Logger } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ITripRepository } from '../../domain/interfaces/trip-repository';
import type { CreateTripData, UpdateTripData, TripFilters } from '../../domain/interfaces/trip-repository';
import type { Trip } from '../../domain/entities/trip.entity';

export class TripPrismaRepository implements ITripRepository {
  private readonly logger = new Logger(TripPrismaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({ where: { id } }) as Promise<Trip | null>;
  }

  async findMany(filters: TripFilters): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        ...(filters.passengerId ? { passengerId: filters.passengerId } : {}),
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Trip[]>;
  }

  async create(data: CreateTripData): Promise<Trip> {
    this.logger.debug(`Creating trip for passenger ${data.passengerId}`);
    return this.prisma.trip.create({ data }) as Promise<Trip>;
  }

  async update(id: string, data: UpdateTripData): Promise<Trip> {
    return this.prisma.trip.update({ where: { id }, data }) as Promise<Trip>;
  }
}
