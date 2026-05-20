import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(50).default(5),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export class NearbyQueryDto extends createZodDto(nearbyQuerySchema) {}
