import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/modules/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.JWT_SECRET = 'test-secret';
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await prisma.user.deleteMany();
});

describe('GET /users/:id', () => {
  it('returns the user profile when the user exists (200)', async () => {
    const created = await prisma.user.create({
      data: {
        email: 'profile@example.com',
        name: 'Carol',
        role: 'PASSENGER',
        passwordHash: 'hash',
      },
    });

    const res = await request(app.getHttpServer()).get(`/users/${created.id}`).expect(200);

    expect(res.body).toMatchObject({
      id: created.id,
      email: 'profile@example.com',
      name: 'Carol',
      role: 'PASSENGER',
    });
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it('returns 404 when the user does not exist', async () => {
    await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
