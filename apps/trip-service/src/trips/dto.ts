import { createZodDto } from 'nestjs-zod';
import { createTripSchema } from '@rocket/contracts';

export class CreateTripDto extends createZodDto(createTripSchema) {}
