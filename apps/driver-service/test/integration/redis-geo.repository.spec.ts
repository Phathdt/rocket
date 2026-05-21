import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { Redis } from '@rocket/redis';
import { DriverEventsPublisher } from '../../src/modules/driver/infrastructure/events/driver-events.publisher';
import { RedisGeoRepository } from '../../src/modules/driver/infrastructure/geo/redis-geo.repository';

let redis: Redis;
let repo: RedisGeoRepository;

beforeAll(() => {
  redis = new Redis(inject('redisUrl'));
  const events = new DriverEventsPublisher(redis);
  repo = new RedisGeoRepository(redis, events);
});

afterAll(async () => {
  await redis.quit();
});

beforeEach(async () => {
  await redis.flushall();
});

// Two points in central Hanoi, roughly 1.5 km apart.
const NEAR = { lat: 21.0285, lng: 105.8542 };
const FAR = { lat: 21.0411, lng: 105.8538 };

describe('RedisGeoRepository (integration)', () => {
  it('addLocation stores coordinates, sets presence and publishes an event', async () => {
    await repo.addLocation('d1', NEAR.lat, NEAR.lng);

    const score = await redis.zscore('drivers:locations', 'd1');
    expect(score).not.toBeNull();
    expect(await redis.get('driver:d1:online')).toBe('1');
    const ttl = await redis.ttl('driver:d1:online');
    expect(ttl).toBeGreaterThan(0);
  });

  it('removeDriver clears coordinates and presence', async () => {
    await repo.addLocation('d1', NEAR.lat, NEAR.lng);
    await repo.removeDriver('d1');

    expect(await redis.zscore('drivers:locations', 'd1')).toBeNull();
    expect(await redis.get('driver:d1:online')).toBeNull();
  });

  it('searchNearby returns drivers within radius ordered by distance', async () => {
    await repo.addLocation('near', NEAR.lat, NEAR.lng);
    await repo.addLocation('far', FAR.lat, FAR.lng);

    const result = await repo.searchNearby(NEAR.lat, NEAR.lng, 5, 10);

    expect(result.map((r) => r.driverId)).toEqual(['near', 'far']);
    expect(result[0].distanceKm).toBeLessThanOrEqual(result[1].distanceKm);
    expect(result[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('searchNearby returns an empty array when nothing is in radius', async () => {
    await repo.addLocation('far', FAR.lat, FAR.lng);
    const result = await repo.searchNearby(NEAR.lat, NEAR.lng, 0.1, 10);
    expect(result).toEqual([]);
  });

  it('acquireLock succeeds once and then fails for the same driver', async () => {
    expect(await repo.acquireLock('d1')).toBe(true);
    expect(await repo.acquireLock('d1')).toBe(false);
  });

  it('releaseLock frees the lock so it can be re-acquired', async () => {
    await repo.acquireLock('d1');
    await repo.releaseLock('d1');
    expect(await repo.acquireLock('d1')).toBe(true);
  });
});
