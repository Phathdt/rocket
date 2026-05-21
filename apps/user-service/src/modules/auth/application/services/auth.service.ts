import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthResponse, RegisterInput, LoginInput } from '@rocket/contracts';
import { IUserRepository } from '../../../user/domain/interfaces/user.repository';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../../domain/errors';
import { IAuthService, TokenPayload } from '../../domain/interfaces/auth.service';
import { ITokenSigner } from '../../domain/interfaces/token-signer';

const BCRYPT_SALT_ROUNDS = 10;

export class AuthService implements IAuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenSigner,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
    });

    const accessToken = this.tokens.sign({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'PASSENGER' | 'DRIVER',
      },
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokens.sign({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'PASSENGER' | 'DRIVER',
      },
    };
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.tokens.verify(token);
      const sub = payload['sub'];
      const role = payload['role'];
      const email = payload['email'];
      if (typeof sub !== 'string' || typeof role !== 'string' || typeof email !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }
      return { sub, role, email };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
