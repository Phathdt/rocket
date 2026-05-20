import { createZodDto } from 'nestjs-zod';
import { updateStatusSchema } from '@rocket/contracts';

export class UpdateStatusDto extends createZodDto(updateStatusSchema) {}
