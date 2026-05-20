import { z } from 'zod';

/** Latitude/longitude bounds reused by location schemas. */
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

/** Create a driver profile (linked to an existing user). */
export const createDriverSchema = z.object({
  userId: z.string().min(1),
  vehiclePlate: z.string().min(1),
  vehicleModel: z.string().min(1),
});

/** Update a driver's availability status. */
export const updateStatusSchema = z.object({
  status: z.enum(['OFFLINE', 'ONLINE', 'BUSY']),
});

/** Periodic location ping sent by the driver app (~every 4s). */
export const locationUpdateSchema = z.object({
  lat: latitude,
  lng: longitude,
});

/** Query for nearest available drivers around a point. */
export const nearbyQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  radiusKm: z.number().positive().max(50).default(5),
  limit: z.number().int().positive().max(50).default(10),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type NearbyQueryInput = z.infer<typeof nearbyQuerySchema>;
