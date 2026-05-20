import type { Trip } from '../entities/trip.entity';
import type { TripStatus } from '@rocket/contracts';

export interface CreateTripData {
  passengerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  status: TripStatus;
}

export interface UpdateTripData {
  status?: TripStatus;
  driverId?: string;
}

export interface TripFilters {
  passengerId?: string;
  driverId?: string;
}

export abstract class ITripRepository {
  abstract findById(id: string): Promise<Trip | null>;
  abstract findMany(filters: TripFilters): Promise<Trip[]>;
  abstract create(data: CreateTripData): Promise<Trip>;
  abstract update(id: string, data: UpdateTripData): Promise<Trip>;
}
