import { Logger } from '@nestjs/common';
import type { RedisClient } from '@rocket/redis';
import { REDIS_CHANNELS, TripEvent } from '@rocket/contracts';
import { ITripEventsPublisher } from '../../domain/interfaces/trip-events-publisher';

/**
 * Publishes trip lifecycle events to Redis Pub/Sub channel `trip:events`.
 * The Gateway subscribes and re-broadcasts over WebSocket room `trip:<id>`.
 */
export class RedisTripEventsPublisher implements ITripEventsPublisher {
  private readonly logger = new Logger(RedisTripEventsPublisher.name);

  constructor(private readonly redis: RedisClient) {}

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
