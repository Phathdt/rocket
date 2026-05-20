import { createZodDto } from 'nestjs-zod';
import { locationUpdateSchema } from '@rocket/contracts';

export class LocationUpdateDto extends createZodDto(locationUpdateSchema) {}
