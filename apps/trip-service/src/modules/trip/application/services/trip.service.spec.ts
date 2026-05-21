import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../../domain/entities/trip.entity';
import type { ITripRepository } from '../../domain/interfaces/trip-repository';
import type { IDriverClient } from '../../domain/interfaces/driver-client';
import type { ITripEventsPublisher } from '../../domain/interfaces/trip-events-publisher';
import {
  TripNotFoundException,
  TripCannotStartException,
  TripCannotCompleteException,
  TripCannotCancelException,
} from '../../domain/errors';
import { TripService } from './trip.service';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'pax-1',
    driverId: 'drv-1',
    pickupLat: 10,
    pickupLng: 20,
    dropoffLat: 30,
    dropoffLng: 40,
    status: TripStatus.ASSIGNED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as ITripRepository & Record<string, ReturnType<typeof vi.fn>>;
  const driverClient = {
    findNearby: vi.fn(),
    assign: vi.fn(),
    release: vi.fn().mockResolvedValue(undefined),
  } as unknown as IDriverClient & Record<string, ReturnType<typeof vi.fn>>;
  const publisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  } as unknown as ITripEventsPublisher & Record<string, ReturnType<typeof vi.fn>>;
  return { repository, driverClient, publisher };
}

describe('TripService', () => {
  let deps: ReturnType<typeof makeDeps>;
  let service: TripService;

  beforeEach(() => {
    deps = makeDeps();
    service = new TripService(deps.repository, deps.driverClient, deps.publisher);
  });

  describe('findById', () => {
    it('returns the trip when found', async () => {
      const trip = makeTrip();
      deps.repository.findById.mockResolvedValue(trip);
      await expect(service.findById('trip-1')).resolves.toBe(trip);
    });

    it('throws TripNotFoundException when missing', async () => {
      deps.repository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(TripNotFoundException);
    });
  });

  describe('findMany', () => {
    it('delegates to repository with filters', async () => {
      const trips = [makeTrip()];
      deps.repository.findMany.mockResolvedValue(trips);
      await expect(service.findMany({ passengerId: 'pax-1' })).resolves.toBe(trips);
      expect(deps.repository.findMany).toHaveBeenCalledWith({ passengerId: 'pax-1' });
    });
  });

  describe('startTrip', () => {
    it('transitions ASSIGNED -> ONGOING and publishes', async () => {
      const trip = makeTrip({ status: TripStatus.ASSIGNED });
      const updated = makeTrip({ status: TripStatus.ONGOING });
      deps.repository.findById.mockResolvedValue(trip);
      deps.repository.update.mockResolvedValue(updated);

      await expect(service.startTrip('trip-1')).resolves.toBe(updated);
      expect(deps.repository.update).toHaveBeenCalledWith('trip-1', { status: TripStatus.ONGOING });
      expect(deps.publisher.publish).toHaveBeenCalledWith({
        type: 'trip',
        tripId: 'trip-1',
        passengerId: 'pax-1',
        driverId: 'drv-1',
        status: TripStatus.ONGOING,
      });
    });

    it('publishes with undefined driverId when trip has no driver', async () => {
      const trip = makeTrip({ status: TripStatus.ASSIGNED, driverId: null });
      deps.repository.findById.mockResolvedValue(trip);
      deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.ONGOING }));

      await service.startTrip('trip-1');
      expect(deps.publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ driverId: undefined }),
      );
    });

    it('throws TripCannotStartException for non-ASSIGNED status', async () => {
      deps.repository.findById.mockResolvedValue(makeTrip({ status: TripStatus.REQUESTED }));
      await expect(service.startTrip('trip-1')).rejects.toBeInstanceOf(TripCannotStartException);
    });
  });

  describe('completeTrip', () => {
    it('transitions ONGOING -> COMPLETED and releases the driver', async () => {
      const trip = makeTrip({ status: TripStatus.ONGOING, driverId: 'drv-1' });
      const updated = makeTrip({ status: TripStatus.COMPLETED });
      deps.repository.findById.mockResolvedValue(trip);
      deps.repository.update.mockResolvedValue(updated);

      await expect(service.completeTrip('trip-1')).resolves.toBe(updated);
      expect(deps.driverClient.release).toHaveBeenCalledWith('drv-1');
      expect(deps.publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ status: TripStatus.COMPLETED }),
      );
    });

    it('does not release a driver when driverId is null', async () => {
      const trip = makeTrip({ status: TripStatus.ONGOING, driverId: null });
      deps.repository.findById.mockResolvedValue(trip);
      deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.COMPLETED }));

      await service.completeTrip('trip-1');
      expect(deps.driverClient.release).not.toHaveBeenCalled();
    });

    it('throws TripCannotCompleteException for non-ONGOING status', async () => {
      deps.repository.findById.mockResolvedValue(makeTrip({ status: TripStatus.ASSIGNED }));
      await expect(service.completeTrip('trip-1')).rejects.toBeInstanceOf(
        TripCannotCompleteException,
      );
    });
  });

  describe('cancelTrip', () => {
    it.each([TripStatus.REQUESTED, TripStatus.NO_DRIVER])(
      'cancels a %s trip without releasing the driver',
      async (status) => {
        const trip = makeTrip({ status, driverId: 'drv-1' });
        deps.repository.findById.mockResolvedValue(trip);
        deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.CANCELLED }));

        await service.cancelTrip('trip-1');
        expect(deps.driverClient.release).not.toHaveBeenCalled();
        expect(deps.publisher.publish).toHaveBeenCalledWith(
          expect.objectContaining({ status: TripStatus.CANCELLED }),
        );
      },
    );

    it.each([TripStatus.ASSIGNED, TripStatus.ONGOING])(
      'cancels a %s trip and releases the driver',
      async (status) => {
        const trip = makeTrip({ status, driverId: 'drv-1' });
        deps.repository.findById.mockResolvedValue(trip);
        deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.CANCELLED }));

        await service.cancelTrip('trip-1');
        expect(deps.driverClient.release).toHaveBeenCalledWith('drv-1');
      },
    );

    it('does not release the driver when an ASSIGNED trip has no driverId', async () => {
      const trip = makeTrip({ status: TripStatus.ASSIGNED, driverId: null });
      deps.repository.findById.mockResolvedValue(trip);
      deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.CANCELLED }));

      await service.cancelTrip('trip-1');
      expect(deps.driverClient.release).not.toHaveBeenCalled();
    });

    it.each([TripStatus.COMPLETED, TripStatus.CANCELLED])(
      'throws TripCannotCancelException for %s status',
      async (status) => {
        deps.repository.findById.mockResolvedValue(makeTrip({ status }));
        await expect(service.cancelTrip('trip-1')).rejects.toBeInstanceOf(
          TripCannotCancelException,
        );
      },
    );
  });
});
