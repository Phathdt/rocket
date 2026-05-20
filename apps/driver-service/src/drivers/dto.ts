import { createZodDto } from 'nestjs-zod';
import { updateStatusSchema, locationUpdateSchema } from '@rocket/contracts';
import { z } from 'zod';

// Extend the contracts schema locally to add `name` field (contracts schema
// has vehicleModel but Prisma Driver model also needs a display name).
const createDriverSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  vehiclePlate: z.string().min(1),
  vehicleModel: z.string().min(1),
});

export class CreateDriverDto extends createZodDto(createDriverSchema) {}
export class UpdateStatusDto extends createZodDto(updateStatusSchema) {}
export class LocationUpdateDto extends createZodDto(locationUpdateSchema) {}

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(50).default(5),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export class NearbyQueryDto extends createZodDto(nearbyQuerySchema) {}
