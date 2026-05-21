import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '../../domain/entities/trip.entity';
import type { ITripRepository } from '../../domain/interfaces/trip-repository';
import type { IDriverClient } from '../../domain/interfaces/driver-client';
import type { ITripEventsPublisher } from '../../domain/interfaces/trip-events-publisher';
import type { RequestTripInput } from '../../domain/interfaces/matching-service';
import { MatchingService } from './matching.service';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'pax-1',
    driverId: null,
    pickupLat: 10,
    pickupLng: 20,
    dropoffLat: 30,
    dropoffLng: 40,
    status: TripStatus.REQUESTED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const input: RequestTripInput = {
  passengerId: 'pax-1',
  pickupLat: 10,
  pickupLng: 20,
  dropoffLat: 30,
  dropoffLng: 40,
};

function makeDeps() {
  const repository = {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn().mockResolvedValue(makeTrip()),
    update: vi.fn(),
  } as unknown as ITripRepository & Record<string, ReturnType<typeof vi.fn>>;
  const driverClient = {
    findNearby: vi.fn(),
    assign: vi.fn(),
    release: vi.fn(),
  } as unknown as IDriverClient & Record<string, ReturnType<typeof vi.fn>>;
  const publisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  } as unknown as ITripEventsPublisher & Record<string, ReturnType<typeof vi.fn>>;
  return { repository, driverClient, publisher };
}

describe('MatchingService.requestTrip', () => {
  let deps: ReturnType<typeof makeDeps>;
  let service: MatchingService;

  beforeEach(() => {
    deps = makeDeps();
    service = new MatchingService(deps.repository, deps.driverClient, deps.publisher);
  });

  it('persists the trip as REQUESTED before matching', async () => {
    deps.driverClient.findNearby.mockResolvedValue([]);
    deps.repository.update.mockResolvedValue(makeTrip({ status: TripStatus.NO_DRIVER }));

    await service.requestTrip(input);
    expect(deps.repository.create).toHaveBeenCalledWith({
      passengerId: 'pax-1',
      pickupLat: 10,
      pickupLng: 20,
      dropoffLat: 30,
      dropoffLng: 40,
      status: TripStatus.REQUESTED,
    });
  });

  it('assigns the first available candidate', async () => {
    deps.driverClient.findNearby.mockResolvedValue([
      { driverId: 'drv-1', distanceKm: 1 },
      { driverId: 'drv-2', distanceKm: 2 },
    ]);
    deps.driverClient.assign.mockResolvedValue({ ok: true });
    const updated = makeTrip({ status: TripStatus.ASSIGNED, driverId: 'drv-1' });
    deps.repository.update.mockResolvedValue(updated);

    await expect(service.requestTrip(input)).resolves.toBe(updated);
    expect(deps.driverClient.assign).toHaveBeenCalledTimes(1);
    expect(deps.driverClient.assign).toHaveBeenCalledWith('drv-1');
    expect(deps.repository.update).toHaveBeenCalledWith('trip-1', {
      status: TripStatus.ASSIGNED,
      driverId: 'drv-1',
    });
    expect(deps.publisher.publish).toHaveBeenCalledWith({
      type: 'trip',
      tripId: 'trip-1',
      passengerId: 'pax-1',
      driverId: 'drv-1',
      status: TripStatus.ASSIGNED,
    });
  });

  it('falls through to the second candidate when the first lock is taken', async () => {
    deps.driverClient.findNearby.mockResolvedValue([
      { driverId: 'drv-1', distanceKm: 1 },
      { driverId: 'drv-2', distanceKm: 2 },
    ]);
    deps.driverClient.assign
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const updated = makeTrip({ status: TripStatus.ASSIGNED, driverId: 'drv-2' });
    deps.repository.update.mockResolvedValue(updated);

    await expect(service.requestTrip(input)).resolves.toBe(updated);
    expect(deps.driverClient.assign).toHaveBeenCalledTimes(2);
    expect(deps.repository.update).toHaveBeenCalledWith('trip-1', {
      status: TripStatus.ASSIGNED,
      driverId: 'drv-2',
    });
  });

  it('marks trip NO_DRIVER when there are zero candidates', async () => {
    deps.driverClient.findNearby.mockResolvedValue([]);
    const updated = makeTrip({ status: TripStatus.NO_DRIVER });
    deps.repository.update.mockResolvedValue(updated);

    await expect(service.requestTrip(input)).resolves.toBe(updated);
    expect(deps.driverClient.assign).not.toHaveBeenCalled();
    expect(deps.repository.update).toHaveBeenCalledWith('trip-1', {
      status: TripStatus.NO_DRIVER,
    });
    expect(deps.publisher.publish).toHaveBeenCalledWith({
      type: 'trip',
      tripId: 'trip-1',
      passengerId: 'pax-1',
      status: TripStatus.NO_DRIVER,
    });
  });

  it('marks trip NO_DRIVER when every candidate lock is taken', async () => {
    deps.driverClient.findNearby.mockResolvedValue([
      { driverId: 'drv-1', distanceKm: 1 },
      { driverId: 'drv-2', distanceKm: 2 },
    ]);
    deps.driverClient.assign.mockResolvedValue({ ok: false });
    const updated = makeTrip({ status: TripStatus.NO_DRIVER });
    deps.repository.update.mockResolvedValue(updated);

    await expect(service.requestTrip(input)).resolves.toBe(updated);
    expect(deps.driverClient.assign).toHaveBeenCalledTimes(2);
    expect(deps.repository.update).toHaveBeenCalledWith('trip-1', {
      status: TripStatus.NO_DRIVER,
    });
  });
});
