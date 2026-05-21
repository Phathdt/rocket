import { describe, expect, it, vi } from 'vitest';

import type { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors';
import type { IUserRepository } from '../../domain/interfaces/user.repository';
import { UserService } from './user.service';

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
  const repo: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  return { repo, service: new UserService(repo) };
}

describe('UserService.findById', () => {
  it('returns the user profile when the user exists', async () => {
    const { repo, service } = buildDeps();
    vi.mocked(repo.findById).mockResolvedValue(buildUser());

    const profile = await service.findById('user-1');

    expect(profile).toEqual({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'PASSENGER',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('throws UserNotFoundError when the user is missing', async () => {
    const { repo, service } = buildDeps();
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(service.findById('ghost')).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
