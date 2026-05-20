import type { TripStatus } from '@rocket/contracts';

export interface Trip {
  id: string;
  passengerId: string;
  driverId: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TripUpdateEvent {
  type: string;
  tripId: string;
  passengerId: string;
  driverId?: string;
  status: TripStatus;
}

export interface DriverLocationEvent {
  driverId: string;
  lat: number;
  lng: number;
}
