import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from '@rocket/redis';
import { REDIS_CHANNELS } from '@rocket/contracts';
import { RealtimeGateway } from './realtime.gateway';
import { TripDriverMap } from './trip-driver.map';

interface TripEventMessage {
  type: string;
  tripId: string;
  passengerId: string;
  driverId?: string;
  status: string;
}

interface DriverLocationMessage {
  type: string;
  driverId: string;
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Subscribes to Redis Pub/Sub channels `trip:events` and `driver:location`.
 * Uses a DUPLICATED ioredis connection — subscriber mode blocks the connection
 * from issuing normal commands, so the shared REDIS_CLIENT must not be used.
 */
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber!: RedisClient;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly gateway: RealtimeGateway,
    private readonly tripDriverMap: TripDriverMap,
  ) {}

  onModuleInit(): void {
    // MUST duplicate — subscribed connection cannot issue normal commands
    this.subscriber = this.redis.duplicate();

    this.subscriber.subscribe(
      REDIS_CHANNELS.TRIP_EVENTS,
      REDIS_CHANNELS.DRIVER_LOCATION,
      (err, count) => {
        if (err) {
          this.logger.error(`Redis subscribe error: ${err.message}`);
          return;
        }
        this.logger.log(`Subscribed to ${count} Redis channel(s)`);
      },
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        if (channel === REDIS_CHANNELS.TRIP_EVENTS) {
          this.handleTripEvent(message);
        } else if (channel === REDIS_CHANNELS.DRIVER_LOCATION) {
          this.handleDriverLocation(message);
        }
      } catch (err) {
        this.logger.error(`Error handling message on ${channel}: ${(err as Error).message}`);
      }
    });
  }

  onModuleDestroy(): void {
    this.subscriber.disconnect();
  }

  private handleTripEvent(raw: string): void {
    const event = JSON.parse(raw) as TripEventMessage;
    const { tripId, driverId, status } = event;

    this.logger.debug(`trip:events → tripId=${tripId} status=${status}`);

    // Update in-memory driverId↔tripId map
    if (status === 'ASSIGNED' && driverId) {
      this.tripDriverMap.set(driverId, tripId);
    } else if ((status === 'COMPLETED' || status === 'CANCELLED') && driverId) {
      this.tripDriverMap.delete(driverId);
    }

    // Broadcast to trip room
    this.gateway.emitTripUpdate(tripId, event as unknown as Record<string, unknown>);
  }

  private handleDriverLocation(raw: string): void {
    const event = JSON.parse(raw) as DriverLocationMessage;
    const { driverId, lat, lng } = event;

    const tripId = this.tripDriverMap.get(driverId);
    if (!tripId) {
      // Driver not assigned to any active trip — skip
      return;
    }

    this.logger.debug(`driver:location → driverId=${driverId} tripId=${tripId}`);
    this.gateway.emitDriverLocation(tripId, { driverId, lat, lng });
  }
}
