import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { TripStatus } from '@rocket/contracts';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { IDriverClient } from '../../src/modules/trip/domain/interfaces/driver-client';

const VALID_BODY = {
  pickup: { lat: 10, lng: 20 },
  dropoff: { lat: 30, lng: 40 },
};

// Fake IDriverClient — the trip↔driver transport (gRPC) is irrelevant here;
// these tests exercise the controller + matching/lifecycle against a stub.
const driverClient = {
  findNearby: vi.fn(),
  assign: vi.fn(),
  release: vi.fn(),
};

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.REDIS_URL = inject('redisUrl');
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IDriverClient)
    .useValue(driverClient)
    .compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await prisma.trip.deleteMany();
  vi.resetAllMocks();
  // Default: exactly one driver available and assignable.
  driverClient.findNearby.mockResolvedValue([{ driverId: 'drv-1', distanceKm: 1 }]);
  driverClient.assign.mockResolvedValue({ ok: true });
  driverClient.release.mockResolvedValue(undefined);
});

/** Create a trip through the API; the default stub yields one available driver. */
async function createAssignedTrip(): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/trips')
    .set('x-user-id', 'pax-1')
    .send(VALID_BODY);
  expect(res.status).toBe(201);
  expect(res.body.status).toBe(TripStatus.ASSIGNED);
  return res.body.id as string;
}

describe('TripController (integration)', () => {
  describe('POST /trips', () => {
    it('returns 400 when the x-user-id header is missing', async () => {
      const res = await request(app.getHttpServer()).post('/trips').send(VALID_BODY);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('x-user-id');
    });

    it('returns 400 for an invalid body', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('x-user-id', 'pax-1')
        .send({ pickup: { lat: 999, lng: 20 }, dropoff: { lat: 30, lng: 40 } });
      expect(res.status).toBe(400);
    });

    it('creates an ASSIGNED trip when a driver is available', async () => {
      const id = await createAssignedTrip();
      expect(id).toBeTruthy();
    });

    it('creates a NO_DRIVER trip when no driver is nearby', async () => {
      driverClient.findNearby.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('x-user-id', 'pax-2')
        .send(VALID_BODY);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe(TripStatus.NO_DRIVER);
    });
  });

  describe('GET /trips', () => {
    it('lists every trip', async () => {
      await createAssignedTrip();
      const res = await request(app.getHttpServer()).get('/trips');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('filters by passengerId', async () => {
      await createAssignedTrip();
      const match = await request(app.getHttpServer()).get('/trips?passengerId=pax-1');
      expect(match.body).toHaveLength(1);
      const miss = await request(app.getHttpServer()).get('/trips?passengerId=other');
      expect(miss.body).toHaveLength(0);
    });
  });

  describe('GET /trips/:id', () => {
    it('returns the trip when found', async () => {
      const id = await createAssignedTrip();
      const res = await request(app.getHttpServer()).get(`/trips/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it('returns 404 for an unknown trip', async () => {
      const res = await request(app.getHttpServer()).get(
        '/trips/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /trips/:id/start', () => {
    it('transitions ASSIGNED -> ONGOING', async () => {
      const id = await createAssignedTrip();
      const res = await request(app.getHttpServer()).post(`/trips/${id}/start`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe(TripStatus.ONGOING);
    });

    it('returns 409 when the trip is not ASSIGNED', async () => {
      const id = await createAssignedTrip();
      await request(app.getHttpServer()).post(`/trips/${id}/start`);
      const res = await request(app.getHttpServer()).post(`/trips/${id}/start`);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /trips/:id/complete', () => {
    it('transitions ONGOING -> COMPLETED and releases the driver', async () => {
      const id = await createAssignedTrip();
      await request(app.getHttpServer()).post(`/trips/${id}/start`);

      const res = await request(app.getHttpServer()).post(`/trips/${id}/complete`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe(TripStatus.COMPLETED);
      expect(driverClient.release).toHaveBeenCalledWith('drv-1');
    });

    it('returns 409 when the trip is not ONGOING', async () => {
      const id = await createAssignedTrip();
      const res = await request(app.getHttpServer()).post(`/trips/${id}/complete`);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /trips/:id/cancel', () => {
    it('cancels an ASSIGNED trip and releases the driver', async () => {
      const id = await createAssignedTrip();

      const res = await request(app.getHttpServer()).post(`/trips/${id}/cancel`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe(TripStatus.CANCELLED);
      expect(driverClient.release).toHaveBeenCalledWith('drv-1');
    });

    it('returns 409 when cancelling an already-cancelled trip', async () => {
      const id = await createAssignedTrip();
      await request(app.getHttpServer()).post(`/trips/${id}/cancel`);

      const res = await request(app.getHttpServer()).post(`/trips/${id}/cancel`);
      expect(res.status).toBe(409);
    });
  });
});
