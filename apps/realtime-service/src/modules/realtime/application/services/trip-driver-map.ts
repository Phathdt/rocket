import { ITripDriverMap } from '../../domain/interfaces/trip-driver-map.interface';

/**
 * In-memory map tracking which trip a driver is currently assigned to.
 * Updated by RedisSubscriberService from trip:events channel.
 * Single instance — no Redis-backed store needed for demo.
 * Scale note: multi-instance deployments require Redis-backed store + Socket.IO Redis adapter.
 */
export class TripDriverMap implements ITripDriverMap {
  private readonly map = new Map<string, string>(); // driverId → tripId

  set(driverId: string, tripId: string): void {
    this.map.set(driverId, tripId);
  }

  get(driverId: string): string | undefined {
    return this.map.get(driverId);
  }

  delete(driverId: string): void {
    this.map.delete(driverId);
  }
}
