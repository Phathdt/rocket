import { createZodDto } from 'nestjs-zod';
import { registerSchema, loginSchema } from '@rocket/contracts';

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
