export interface NearbyDriver {
  driverId: string;
  distanceKm: number;
}

export interface AssignResult {
  ok: boolean;
}

export abstract class IDriverClient {
  abstract findNearby(lat: number, lng: number, radiusKm: number, limit: number): Promise<NearbyDriver[]>;
  abstract assign(driverId: string): Promise<AssignResult>;
  abstract release(driverId: string): Promise<void>;
}
