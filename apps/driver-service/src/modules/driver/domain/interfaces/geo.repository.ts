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

  /**
   * Returns the subset of driverIds whose presence key (`driver:<id>:online`)
   * still exists in Redis. Uses a single pipeline — no N round trips.
   */
  abstract checkPresence(driverIds: string[]): Promise<Set<string>>;

  /**
   * Returns all driver IDs whose `drivers:lastseen` score is older than
   * `beforeMs` (epoch ms). Used by the liveness sweeper.
   */
  abstract getStaleSince(beforeMs: number): Promise<string[]>;

  abstract acquireLock(driverId: string): Promise<boolean>;

  abstract releaseLock(driverId: string): Promise<void>;
}
