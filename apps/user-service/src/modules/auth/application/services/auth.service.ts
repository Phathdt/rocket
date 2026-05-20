import * as bcrypt from 'bcrypt';
import type { AuthResponse, RegisterInput, LoginInput } from '@rocket/contracts';
import { IUserRepository } from '../../../user/domain/interfaces/user.repository';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../../domain/errors';
import { IAuthService } from '../../domain/interfaces/auth.service';
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
}
