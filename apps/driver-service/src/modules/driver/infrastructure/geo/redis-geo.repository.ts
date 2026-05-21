import { Logger } from '@nestjs/common';
import { GEO_KEY, driverLockKey, driverPresenceKey } from '@rocket/contracts';
import type { RedisClient as Redis } from '@rocket/redis';
import type { NearbyDriver } from '../../domain/interfaces/geo.repository';
import { IGeoRepository } from '../../domain/interfaces/geo.repository';
import type { DriverEventsPublisher } from '../events/driver-events.publisher';

/** ZSET tracking last-seen timestamp (ms) per driver. Driver-service internal key. */
export const LAST_SEEN_KEY = 'drivers:lastseen';

/**
 * Over-fetch multiplier for GEOSEARCH so presence/status filters
 * don't starve results when nearby ghosts are present.
 */
const GEO_OVER_FETCH = 10;
const GEO_MIN_FETCH = 50;

export class RedisGeoRepository extends IGeoRepository {
  private readonly logger = new Logger(RedisGeoRepository.name);

  constructor(
    private readonly redis: Redis,
    private readonly events: DriverEventsPublisher,
  ) {
    super();
  }

  async addLocation(driverId: string, lat: number, lng: number): Promise<void> {
    // GEOADD key longitude latitude member  (lng first — per Redis spec)
    await this.redis.geoadd(GEO_KEY, lng, lat, driverId);
    // Presence TTL: mark driver as active for 30 s
    await this.redis.set(driverPresenceKey(driverId), '1', 'EX', 30);
    // Track last-seen for the liveness sweeper
    await this.redis.zadd(LAST_SEEN_KEY, Date.now(), driverId);
    // Publish location event for real-time Gateway forwarding
    await this.events.publishLocation({ driverId, lat, lng, ts: Date.now() });
  }

  async removeDriver(driverId: string): Promise<void> {
    await this.redis.zrem(GEO_KEY, driverId);
    await this.redis.del(driverPresenceKey(driverId));
    await this.redis.zrem(LAST_SEEN_KEY, driverId);
  }

  /**
   * GEOSEARCH with an over-fetched COUNT to avoid starvation when ghosts
   * occupy the nearest N slots. Callers apply their own final slice.
   *
   * ioredis returns: [member, distance][] when WITHDIST + no WITHCOORD.
   * Note: longitude (lng) comes first per Redis GEO protocol.
   */
  async searchNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<NearbyDriver[]> {
    const fetchCount = Math.max(limit * GEO_OVER_FETCH, GEO_MIN_FETCH);

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
      String(fetchCount),
      'WITHDIST',
    )) as Array<[string, string]>;

    if (!raw || raw.length === 0) return [];

    return raw.map(([member, dist]) => ({
      driverId: member,
      distanceKm: parseFloat(dist),
    }));
  }

  /**
   * Checks which driver IDs still have a live presence key.
   * Uses a single Redis pipeline — one round trip regardless of candidate count.
   */
  async checkPresence(driverIds: string[]): Promise<Set<string>> {
    if (driverIds.length === 0) return new Set();

    const pipeline = this.redis.pipeline();
    for (const id of driverIds) {
      pipeline.exists(driverPresenceKey(id));
    }

    const results = await pipeline.exec();
    const alive = new Set<string>();

    if (!results) return alive;

    results.forEach(([err, count], idx) => {
      if (!err && (count as number) > 0) {
        alive.add(driverIds[idx]);
      }
    });

    return alive;
  }

  /**
   * Returns driver IDs from `drivers:lastseen` with score < beforeMs.
   * Used by the liveness sweeper to find stale GEO set members.
   */
  async getStaleSince(beforeMs: number): Promise<string[]> {
    const members = await this.redis.zrangebyscore(
      LAST_SEEN_KEY,
      '-inf',
      `(${beforeMs}`,
    );
    return members;
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
