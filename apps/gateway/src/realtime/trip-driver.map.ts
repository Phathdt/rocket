import { Injectable } from '@nestjs/common';

/**
 * In-memory map tracking which trip a driver is currently assigned to.
 * Updated by RedisSubscriberService from trip:events channel.
 * Single gateway instance — no Redis-backed store needed for demo.
 */
@Injectable()
export class TripDriverMap {
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
