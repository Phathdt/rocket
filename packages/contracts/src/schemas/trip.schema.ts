import { z } from 'zod';

/** A geographic coordinate (pickup or dropoff point). */
export const coordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Create a trip request from pickup to dropoff. */
export const createTripSchema = z.object({
  pickup: coordSchema,
  dropoff: coordSchema,
});

export type Coord = z.infer<typeof coordSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
