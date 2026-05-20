import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { REDIS_CHANNELS } from '@rocket/contracts';

export interface DriverLocationPayload {
  driverId: string;
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Publishes driver location events to Redis Pub/Sub channel `driver:location`.
 * The Gateway subscribes and forwards to the relevant trip room via WebSocket.
 */
@Injectable()
export class DriverEventsPublisher {
  private readonly logger = new Logger(DriverEventsPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async publishLocation(payload: DriverLocationPayload): Promise<void> {
    try {
      const message = JSON.stringify({
        type: 'driver-location',
        ...payload,
      });
      await this.redis.publish(REDIS_CHANNELS.DRIVER_LOCATION, message);
      this.logger.debug(`Published location for driver ${payload.driverId}`);
    } catch (err) {
      this.logger.error(
        `Failed to publish driver location: ${(err as Error).message}`,
      );
    }
  }
}
