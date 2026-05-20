import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@rocket/contracts';

export { loginSchema };
export class LoginDto extends createZodDto(loginSchema) {}
