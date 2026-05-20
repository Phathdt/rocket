import type { TripStatus } from '@rocket/contracts';

/** Plain domain entity — never imports Prisma types */
export interface Trip {
  id: string;
  passengerId: string;
  driverId: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  status: TripStatus;
  createdAt: Date;
  updatedAt: Date;
}
