import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { GEO_KEY, driverLockKey, driverPresenceKey } from '@rocket/contracts';
import { DriverEventsPublisher } from './driver-events.publisher';

export interface NearbyDriver {
  driverId: string;
  distanceKm: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly driverEventsPublisher: DriverEventsPublisher,
  ) {}

  async addLocation(driverId: string, lat: number, lng: number): Promise<void> {
    // GEOADD key longitude latitude member  (lng first — per Redis spec)
    await this.redis.geoadd(GEO_KEY, lng, lat, driverId);
    // Presence TTL: mark driver as active for 30 s
    await this.redis.set(driverPresenceKey(driverId), '1', 'EX', 30);
    // Publish location event for real-time Gateway forwarding
    await this.driverEventsPublisher.publishLocation({
      driverId,
      lat,
      lng,
      ts: Date.now(),
    });
  }

  async removeDriver(driverId: string): Promise<void> {
    await this.redis.zrem(GEO_KEY, driverId);
    await this.redis.del(driverPresenceKey(driverId));
  }

  /**
   * GEOSEARCH FROMLONLAT <lng> <lat> BYRADIUS <km> km ASC COUNT <limit> WITHDIST
   * ioredis returns: [member, distance][] when WITHDIST + no WITHCOORD
   * Note: longitude (lng) comes first per Redis GEO protocol.
   */
  async searchNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<NearbyDriver[]> {
    // ioredis geosearch signature:
    // geosearch(key, frommember|fromlonlat, ...args)
    // With FROMLONLAT: geosearch(key, 'FROMLONLAT', lng, lat, 'BYRADIUS', r, 'km', 'ASC', 'COUNT', n, 'WITHDIST')
    const raw = (await this.redis.call(
      'GEOSEARCH',
      GEO_KEY,
      'FROMLONLAT',
      String(lng),
      String(lat),
      'BYRADIUS',
      String(radiusKm),
      'km',
      'ASC',
      'COUNT',
      String(limit),
      'WITHDIST',
    )) as Array<[string, string]>;

    if (!raw || raw.length === 0) return [];

    return raw.map(([member, dist]) => ({
      driverId: member,
      distanceKm: parseFloat(dist),
    }));
  }

  async acquireLock(driverId: string): Promise<boolean> {
    // ioredis SET NX EX: order is EX <seconds> NX (EX before NX per overload signature)
    const result = await this.redis.set(
      driverLockKey(driverId),
      '1',
      'EX',
      10,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(driverId: string): Promise<void> {
    await this.redis.del(driverLockKey(driverId));
  }
}
