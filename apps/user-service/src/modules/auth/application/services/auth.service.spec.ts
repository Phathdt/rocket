import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { IUserRepository } from '../../../user/domain/interfaces/user.repository';
import type { User } from '../../../user/domain/entities/user.entity';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../../domain/errors';
import type { ITokenSigner } from '../../domain/interfaces/token-signer';
import { AuthService } from './auth.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    role: 'PASSENGER',
    passwordHash: 'hashed',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildDeps() {
  const users: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  const tokens: ITokenSigner = {
    sign: vi.fn(() => 'signed-token'),
    verify: vi.fn(() => ({ sub: 'user-1', role: 'PASSENGER', email: 'alice@example.com' })),
  };
  return { users, tokens, service: new AuthService(users, tokens) };
}

describe('AuthService.register', () => {
  it('hashes the password, persists the user and returns a token', async () => {
    const { users, tokens, service } = buildDeps();
    vi.mocked(users.findByEmail).mockResolvedValue(null);
    vi.mocked(users.create).mockResolvedValue(buildUser());

    const result = await service.register({
      email: 'alice@example.com',
      name: 'Alice',
      role: 'PASSENGER',
      password: 'secret123',
    });

    const createArg = vi.mocked(users.create).mock.calls[0][0];
    expect(await bcrypt.compare('secret123', createArg.passwordHash)).toBe(true);
    expect(tokens.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alice@example.com',
      role: 'PASSENGER',
    });
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', role: 'PASSENGER' },
    });
  });

  it('rejects a duplicate email', async () => {
    const { users, service } = buildDeps();
    vi.mocked(users.findByEmail).mockResolvedValue(buildUser());

    await expect(
      service.register({
        email: 'alice@example.com',
        name: 'Alice',
        role: 'PASSENGER',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(users.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('returns a token when credentials match', async () => {
    const { users, service } = buildDeps();
    const passwordHash = await bcrypt.hash('secret123', 10);
    vi.mocked(users.findByEmail).mockResolvedValue(buildUser({ passwordHash }));

    const result = await service.login({ email: 'alice@example.com', password: 'secret123' });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.email).toBe('alice@example.com');
  });

  it('rejects an unknown email', async () => {
    const { users, service } = buildDeps();
    vi.mocked(users.findByEmail).mockResolvedValue(null);

    await expect(
      service.login({ email: 'ghost@example.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects a wrong password', async () => {
    const { users, service } = buildDeps();
    const passwordHash = await bcrypt.hash('correct-password', 10);
    vi.mocked(users.findByEmail).mockResolvedValue(buildUser({ passwordHash }));

    await expect(
      service.login({ email: 'alice@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe('AuthService.verifyToken', () => {
  it('returns payload for a valid token', async () => {
    const { tokens, service } = buildDeps();
    vi.mocked(tokens.verify).mockReturnValue({
      sub: 'user-1',
      role: 'DRIVER',
      email: 'alice@example.com',
    });

    const payload = await service.verifyToken('valid-token');

    expect(tokens.verify).toHaveBeenCalledWith('valid-token');
    expect(payload).toEqual({ sub: 'user-1', role: 'DRIVER', email: 'alice@example.com' });
  });

  it('throws UnauthorizedException when verify throws', async () => {
    const { tokens, service } = buildDeps();
    vi.mocked(tokens.verify).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(service.verifyToken('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException for missing payload fields', async () => {
    const { tokens, service } = buildDeps();
    vi.mocked(tokens.verify).mockReturnValue({ sub: 'user-1' }); // missing role, email

    await expect(service.verifyToken('incomplete-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
