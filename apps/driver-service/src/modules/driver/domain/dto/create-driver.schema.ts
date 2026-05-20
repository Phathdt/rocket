import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Extends contracts schema locally — contracts schema omits `name`
export const createDriverSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  vehiclePlate: z.string().min(1),
  vehicleModel: z.string().min(1),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export class CreateDriverDto extends createZodDto(createDriverSchema) {}
