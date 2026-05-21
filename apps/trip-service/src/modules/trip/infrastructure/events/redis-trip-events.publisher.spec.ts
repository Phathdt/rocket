import { describe, expect, it, vi } from 'vitest';
import { REDIS_CHANNELS, TripStatus, type TripEvent } from '@rocket/contracts';
import type { RedisClient } from '@rocket/redis';
import { RedisTripEventsPublisher } from './redis-trip-events.publisher';

const event: TripEvent = {
  type: 'trip',
  tripId: 'trip-1',
  passengerId: 'pax-1',
  driverId: 'drv-1',
  status: TripStatus.ASSIGNED,
};

describe('RedisTripEventsPublisher', () => {
  it('publishes the serialised event to the trip-events channel', async () => {
    const redis = { publish: vi.fn().mockResolvedValue(1) } as unknown as RedisClient;
    const publisher = new RedisTripEventsPublisher(redis);

    await publisher.publish(event);

    expect(redis.publish).toHaveBeenCalledWith(
      REDIS_CHANNELS.TRIP_EVENTS,
      JSON.stringify(event),
    );
  });

  it('swallows errors when redis.publish rejects', async () => {
    const redis = {
      publish: vi.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as RedisClient;
    const publisher = new RedisTripEventsPublisher(redis);

    await expect(publisher.publish(event)).resolves.toBeUndefined();
  });
});
