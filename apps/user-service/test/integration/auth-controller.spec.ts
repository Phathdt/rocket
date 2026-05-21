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

describe('POST /auth/register', () => {
  it('registers a new user and returns a token (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'register-success@example.com',
        password: 'secret123',
        name: 'Alice',
        role: 'PASSENGER',
      })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      email: 'register-success@example.com',
      name: 'Alice',
      role: 'PASSENGER',
    });
  });

  it('rejects a duplicate email (409)', async () => {
    const payload = {
      email: 'duplicate@example.com',
      password: 'secret123',
      name: 'Alice',
      role: 'PASSENGER',
    };
    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(409);
  });

  it('rejects an invalid body (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123', name: '', role: 'PASSENGER' })
      .expect(400);
  });
});

describe('POST /auth/login', () => {
  const credentials = {
    email: 'login@example.com',
    password: 'secret123',
    name: 'Bob',
    role: 'DRIVER',
  };

  beforeEach(async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201);
  });

  it('returns a token for valid credentials (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(credentials.email);
  });

  it('rejects a wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects an unknown email (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'secret123' })
      .expect(401);
  });

  it('rejects an invalid body (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });
});

describe('GET /auth/verify', () => {
  const credentials = {
    email: 'verify@example.com',
    password: 'secret123',
    name: 'Vera',
    role: 'PASSENGER',
  };

  it('accepts a valid token and exposes user identity headers (200)', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const token: string = registered.body.accessToken;

    const res = await request(app.getHttpServer())
      .get('/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['x-user-id']).toEqual(expect.any(String));
    expect(res.headers['x-user-role']).toBe('PASSENGER');
  });

  it('rejects a missing Authorization header (401)', async () => {
    await request(app.getHttpServer()).get('/auth/verify').expect(401);
  });

  it('rejects a malformed Authorization header (401)', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify')
      .set('Authorization', 'Token abc')
      .expect(401);
  });

  it('rejects an invalid/garbage bearer token (401)', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
  });
});
