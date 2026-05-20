import { z } from 'zod';

/** Registration payload — role decides PASSENGER vs DRIVER account. */
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['PASSENGER', 'DRIVER']),
});

/** Login payload. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Decoded JWT payload issued by the User Service. */
export const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.enum(['PASSENGER', 'DRIVER']),
});

/** Auth response returned after register/login. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['PASSENGER', 'DRIVER']),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
