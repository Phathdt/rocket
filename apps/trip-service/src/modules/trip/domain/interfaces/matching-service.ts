import type { Trip } from '../entities/trip.entity';

export interface RequestTripInput {
  passengerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

export abstract class IMatchingService {
  abstract requestTrip(input: RequestTripInput): Promise<Trip>;
}
