import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { UserPrismaRepository } from '../../src/modules/user/infrastructure/repositories/user.prisma-repository';

describe('UserPrismaRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: UserPrismaRepository;

  beforeAll(async () => {
    prisma = new PrismaService(inject('databaseUrl'));
    await prisma.onModuleInit();
    repo = new UserPrismaRepository(prisma);
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('creates a user and reads it back by id and email', async () => {
    const created = await repo.create({
      email: 'alice@example.com',
      name: 'Alice',
      role: 'PASSENGER',
      passwordHash: 'hash',
    });

    expect(created.id).toBeTruthy();
    expect(await repo.findById(created.id)).toMatchObject({ email: 'alice@example.com' });
    expect(await repo.findByEmail('alice@example.com')).toMatchObject({ id: created.id });
  });

  it('returns null when the user does not exist', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(await repo.findByEmail('missing@example.com')).toBeNull();
  });
});
