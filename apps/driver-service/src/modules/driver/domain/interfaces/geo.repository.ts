export interface NearbyDriver {
  driverId: string;
  distanceKm: number;
}

export abstract class IGeoRepository {
  abstract addLocation(driverId: string, lat: number, lng: number): Promise<void>;

  abstract removeDriver(driverId: string): Promise<void>;

  abstract searchNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<NearbyDriver[]>;

  abstract acquireLock(driverId: string): Promise<boolean>;

  abstract releaseLock(driverId: string): Promise<void>;
}
