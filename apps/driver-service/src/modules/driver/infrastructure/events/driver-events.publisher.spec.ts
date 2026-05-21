import { describe, expect, it, vi } from 'vitest';
import { REDIS_CHANNELS } from '@rocket/contracts';
import type { RedisClient } from '@rocket/redis';
import { DriverEventsPublisher } from './driver-events.publisher';

describe('DriverEventsPublisher', () => {
  const payload = { driverId: 'd1', lat: 10, lng: 20, ts: 1700000000000 };

  it('publishes a serialized location message to the driver:location channel', async () => {
    const publish = vi.fn().mockResolvedValue(1);
    const publisher = new DriverEventsPublisher({ publish } as unknown as RedisClient);

    await publisher.publishLocation(payload);

    expect(publish).toHaveBeenCalledTimes(1);
    const [channel, message] = publish.mock.calls[0];
    expect(channel).toBe(REDIS_CHANNELS.DRIVER_LOCATION);
    expect(JSON.parse(message as string)).toEqual({
      type: 'driver-location',
      ...payload,
    });
  });

  it('swallows errors when publish rejects', async () => {
    const publish = vi.fn().mockRejectedValue(new Error('redis offline'));
    const publisher = new DriverEventsPublisher({ publish } as unknown as RedisClient);

    await expect(publisher.publishLocation(payload)).resolves.toBeUndefined();
  });
});
