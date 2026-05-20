/**
 * Shared domain enums for the ride-hailing system.
 * Declared as const objects so values can be reused at runtime
 * while the matching type is derived via index access.
 */

export const TripStatus = {
  REQUESTED: 'REQUESTED',
  ASSIGNED: 'ASSIGNED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_DRIVER: 'NO_DRIVER',
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const DriverStatus = {
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  BUSY: 'BUSY',
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const UserRole = {
  PASSENGER: 'PASSENGER',
  DRIVER: 'DRIVER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
