import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { Redis } from '@rocket/redis';
import { DriverStatus } from '@rocket/contracts';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;
let redis: Redis;
let userSeq = 0;

function uniqueUser(): string {
  userSeq += 1;
  return `user-dispatch-${Date.now()}-${userSeq}`;
}

function createPayload(userId = uniqueUser()) {
  return { userId, name: 'Bob', vehiclePlate: 'PLATE-2', vehicleModel: 'Honda' };
}

async function createDriver(): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/drivers')
    .send(createPayload())
    .expect(201);
  return res.body.id as string;
}

async function setStatus(id: string, status: string): Promise<void> {
  await request(app.getHttpServer())
    .post(`/drivers/${id}/status`)
    .send({ status })
    .expect(200);
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
  redis = new Redis(inject('redisUrl'));
});

afterAll(async () => {
  await redis.quit();
  await app.close();
});

beforeEach(async () => {
  await prisma.driver.deleteMany();
  await redis.flushall();
});

describe('DriverController dispatch (integration)', () => {
  it('POST /drivers/:id/location succeeds for an ONLINE driver (200)', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.ONLINE);
    const res = await request(app.getHttpServer())
      .post(`/drivers/${id}/location`)
      .send({ lat: 21.0285, lng: 105.8542 })
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /drivers/:id/location succeeds for a BUSY driver (200)', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.BUSY);
    await request(app.getHttpServer())
      .post(`/drivers/${id}/location`)
      .send({ lat: 21.0285, lng: 105.8542 })
      .expect(200);
  });

  it('POST /drivers/:id/location fails for an OFFLINE driver (409)', async () => {
    const id = await createDriver();
    await request(app.getHttpServer())
      .post(`/drivers/${id}/location`)
      .send({ lat: 21.0285, lng: 105.8542 })
      .expect(409);
  });

  it('POST /drivers/:id/location rejects an out-of-range body (400)', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.ONLINE);
    await request(app.getHttpServer())
      .post(`/drivers/${id}/location`)
      .send({ lat: 999, lng: 105.8542 })
      .expect(400);
  });

  it('POST /drivers/:id/assign succeeds, then conflicts on a second attempt', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.ONLINE);

    const first = await request(app.getHttpServer())
      .post(`/drivers/${id}/assign`)
      .expect(200);
    expect(first.body).toEqual({ ok: true });

    await request(app.getHttpServer()).post(`/drivers/${id}/assign`).expect(409);
  });

  it('POST /drivers/:id/release sets the driver back ONLINE (200)', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.ONLINE);
    await request(app.getHttpServer()).post(`/drivers/${id}/assign`).expect(200);

    const res = await request(app.getHttpServer())
      .post(`/drivers/${id}/release`)
      .expect(200);
    expect(res.body.status).toBe(DriverStatus.ONLINE);
  });

  it('GET /drivers/nearby returns an ONLINE driver with a location', async () => {
    const id = await createDriver();
    await setStatus(id, DriverStatus.ONLINE);
    await request(app.getHttpServer())
      .post(`/drivers/${id}/location`)
      .send({ lat: 21.0285, lng: 105.8542 })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: 21.0285, lng: 105.8542, radiusKm: 5, limit: 10 })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].driverId).toBe(id);
    expect(res.body[0].name).toBe('Bob');
    expect(res.body[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('GET /drivers/nearby applies coerced defaults for radiusKm and limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: 21.0285, lng: 105.8542 })
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /drivers/nearby rejects an invalid query (400)', async () => {
    await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: 'not-a-number', lng: 105.8542 })
      .expect(400);
  });
});
