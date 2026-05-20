import type { Trip } from '../entities/trip.entity';
import type { TripFilters } from './trip-repository';

export abstract class ITripService {
  abstract findById(id: string): Promise<Trip>;
  abstract findMany(filters: TripFilters): Promise<Trip[]>;
  abstract startTrip(id: string): Promise<Trip>;
  abstract completeTrip(id: string): Promise<Trip>;
  abstract cancelTrip(id: string): Promise<Trip>;
}
