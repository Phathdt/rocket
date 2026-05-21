import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { TripStatus } from '@rocket/contracts';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { TripPrismaRepository } from '../../src/modules/trip/infrastructure/repositories/trip.prisma-repository';
import type { CreateTripData } from '../../src/modules/trip/domain/interfaces/trip-repository';

let prisma: PrismaService;
let repo: TripPrismaRepository;

function makeData(overrides: Partial<CreateTripData> = {}): CreateTripData {
  return {
    passengerId: 'pax-1',
    pickupLat: 10,
    pickupLng: 20,
    dropoffLat: 30,
    dropoffLng: 40,
    status: TripStatus.REQUESTED,
    ...overrides,
  };
}

beforeAll(async () => {
  prisma = new PrismaService(inject('databaseUrl'));
  await prisma.onModuleInit();
  repo = new TripPrismaRepository(prisma);
});

afterAll(async () => {
  await prisma.onModuleDestroy();
});

beforeEach(async () => {
  await prisma.trip.deleteMany();
});

describe('TripPrismaRepository (integration)', () => {
  describe('create', () => {
    it('persists a trip with the provided fields', async () => {
      const trip = await repo.create(makeData());
      expect(trip.id).toBeTruthy();
      expect(trip.passengerId).toBe('pax-1');
      expect(trip.driverId).toBeNull();
      expect(trip.status).toBe(TripStatus.REQUESTED);
      expect(trip.pickupLat).toBe(10);
    });
  });

  describe('findById', () => {
    it('returns the trip when it exists', async () => {
      const created = await repo.create(makeData());
      const found = await repo.findById(created.id);
      expect(found?.id).toBe(created.id);
    });

    it('returns null for an unknown id', async () => {
      await expect(repo.findById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });
  });

  describe('findMany', () => {
    it('filters by passengerId', async () => {
      await repo.create(makeData({ passengerId: 'pax-a' }));
      await repo.create(makeData({ passengerId: 'pax-b' }));

      const result = await repo.findMany({ passengerId: 'pax-a' });
      expect(result).toHaveLength(1);
      expect(result[0].passengerId).toBe('pax-a');
    });

    it('filters by driverId', async () => {
      const withDriver = await repo.create(makeData());
      await repo.update(withDriver.id, { driverId: 'drv-9', status: TripStatus.ASSIGNED });
      await repo.create(makeData());

      const result = await repo.findMany({ driverId: 'drv-9' });
      expect(result).toHaveLength(1);
      expect(result[0].driverId).toBe('drv-9');
    });

    it('returns all trips when no filter is given', async () => {
      await repo.create(makeData());
      await repo.create(makeData());
      await expect(repo.findMany({})).resolves.toHaveLength(2);
    });
  });

  describe('update', () => {
    it('mutates the trip status and driver', async () => {
      const created = await repo.create(makeData());
      const updated = await repo.update(created.id, {
        status: TripStatus.ASSIGNED,
        driverId: 'drv-7',
      });
      expect(updated.status).toBe(TripStatus.ASSIGNED);
      expect(updated.driverId).toBe('drv-7');
    });
  });
});
