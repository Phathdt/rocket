/**
 * Redis channel names and key builders shared across services.
 * Centralised here so producers and consumers never drift.
 */

export const REDIS_CHANNELS = {
  TRIP_EVENTS: 'trip:events',
  DRIVER_LOCATION: 'driver:location',
} as const;
export type RedisChannel = (typeof REDIS_CHANNELS)[keyof typeof REDIS_CHANNELS];

/** GEO set holding live driver coordinates for nearest-driver matching. */
export const GEO_KEY = 'drivers:locations';

/** Lock key used to atomically claim a driver during trip matching. */
export const driverLockKey = (id: string): string => `driver:${id}:lock`;

/** Presence key (TTL) marking a driver as currently online. */
export const driverPresenceKey = (id: string): string => `driver:${id}:online`;
