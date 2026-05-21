import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { DriverStatus } from '@rocket/contracts';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;
let userSeq = 0;

function uniqueUser(): string {
  userSeq += 1;
  return `user-crud-${Date.now()}-${userSeq}`;
}

function createPayload(userId = uniqueUser()) {
  return { userId, name: 'Alice', vehiclePlate: 'PLATE-1', vehicleModel: 'Toyota' };
}

beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.REDIS_URL = inject('redisUrl');
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
  await prisma.driver.deleteMany();
});

describe('DriverController CRUD (integration)', () => {
  it('POST /drivers creates a driver (201)', async () => {
    const payload = createPayload();
    const res = await request(app.getHttpServer()).post('/drivers').send(payload).expect(201);
    expect(res.body.id).toBeTypeOf('string');
    expect(res.body.userId).toBe(payload.userId);
    expect(res.body.status).toBe(DriverStatus.OFFLINE);
  });

  it('POST /drivers rejects a duplicate userId (409)', async () => {
    const payload = createPayload();
    await request(app.getHttpServer()).post('/drivers').send(payload).expect(201);
    await request(app.getHttpServer()).post('/drivers').send(payload).expect(409);
  });

  it('POST /drivers rejects an invalid body (400)', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({ userId: '', name: '', vehiclePlate: '', vehicleModel: '' })
      .expect(400);
  });

  it('GET /drivers/:id returns the driver when found', async () => {
    const created = await request(app.getHttpServer())
      .post('/drivers')
      .send(createPayload())
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/drivers/${created.body.id}`)
      .expect(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('GET /drivers/:id returns 404 when missing', async () => {
    await request(app.getHttpServer())
      .get('/drivers/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('GET /drivers/by-user/:userId returns the driver when found', async () => {
    const payload = createPayload();
    await request(app.getHttpServer()).post('/drivers').send(payload).expect(201);
    const res = await request(app.getHttpServer())
      .get(`/drivers/by-user/${payload.userId}`)
      .expect(200);
    expect(res.body.userId).toBe(payload.userId);
  });

  it('GET /drivers/by-user/:userId returns 404 when missing', async () => {
    await request(app.getHttpServer()).get('/drivers/by-user/nobody').expect(404);
  });

  it('POST /drivers/:id/status updates the status (200)', async () => {
    const created = await request(app.getHttpServer())
      .post('/drivers')
      .send(createPayload())
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/drivers/${created.body.id}/status`)
      .send({ status: DriverStatus.ONLINE })
      .expect(200);
    expect(res.body.status).toBe(DriverStatus.ONLINE);
  });

  it('POST /drivers/:id/status rejects an invalid status (400)', async () => {
    const created = await request(app.getHttpServer())
      .post('/drivers')
      .send(createPayload())
      .expect(201);
    await request(app.getHttpServer())
      .post(`/drivers/${created.body.id}/status`)
      .send({ status: 'FLYING' })
      .expect(400);
  });
});
