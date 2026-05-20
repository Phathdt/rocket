import { Injectable, Inject, Logger } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { REDIS_CHANNELS, TripEvent } from '@rocket/contracts';

/**
 * Publishes trip lifecycle events to Redis Pub/Sub channel `trip:events`.
 * The Gateway subscribes and re-broadcasts over WebSocket room `trip:<id>`.
 */
@Injectable()
export class TripEventsPublisher {
  private readonly logger = new Logger(TripEventsPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async publish(event: TripEvent): Promise<void> {
    try {
      const payload = JSON.stringify(event);
      await this.redis.publish(REDIS_CHANNELS.TRIP_EVENTS, payload);
      this.logger.debug(`Published ${event.status} for trip ${event.tripId}`);
    } catch (err) {
      this.logger.error(`Failed to publish trip event: ${(err as Error).message}`);
    }
  }
}
