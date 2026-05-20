import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@rocket/contracts';

export { registerSchema };
export class RegisterDto extends createZodDto(registerSchema) {}
