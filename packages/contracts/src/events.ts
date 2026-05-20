import { z } from 'zod';

/**
 * Cross-service event payloads carried over Redis Pub/Sub.
 * The Gateway subscribes to these channels and re-broadcasts
 * over WebSocket rooms (`trip:<id>`).
 */

/** Trip lifecycle event published on REDIS_CHANNELS.TRIP_EVENTS. */
export const tripEventSchema = z.object({
  type: z.literal('trip'),
  tripId: z.string(),
  passengerId: z.string(),
  driverId: z.string().optional(),
  status: z.enum([
    'REQUESTED',
    'ASSIGNED',
    'ONGOING',
    'COMPLETED',
    'CANCELLED',
    'NO_DRIVER',
  ]),
});

/** Driver location event published on REDIS_CHANNELS.DRIVER_LOCATION. */
export const driverLocationEventSchema = z.object({
  type: z.literal('driver-location'),
  driverId: z.string(),
  tripId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  ts: z.number(),
});

export type TripEvent = z.infer<typeof tripEventSchema>;
export type DriverLocationEvent = z.infer<typeof driverLocationEventSchema>;
