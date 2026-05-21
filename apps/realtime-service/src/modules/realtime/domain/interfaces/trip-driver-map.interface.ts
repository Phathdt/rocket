export abstract class ITripDriverMap {
  abstract set(driverId: string, tripId: string): void;
  abstract get(driverId: string): string | undefined;
  abstract delete(driverId: string): void;
}
