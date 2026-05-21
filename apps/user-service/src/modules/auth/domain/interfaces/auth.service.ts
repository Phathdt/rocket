import type { AuthResponse } from '@rocket/contracts';
import type { LoginInput, RegisterInput } from '@rocket/contracts';

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
}

export abstract class IAuthService {
  abstract register(input: RegisterInput): Promise<AuthResponse>;
  abstract login(input: LoginInput): Promise<AuthResponse>;
  abstract verifyToken(token: string): Promise<TokenPayload>;
}
