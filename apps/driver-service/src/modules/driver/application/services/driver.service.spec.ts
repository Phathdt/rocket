import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverStatus } from '@rocket/contracts';
import type { Driver } from '../../domain/entities/driver.entity';
import {
  DriverAlreadyExistsError,
  DriverNotAvailableError,
  DriverNotFoundError,
} from '../../domain/errors';
import type { IDriverRepository } from '../../domain/interfaces/driver.repository';
import type { IGeoRepository } from '../../domain/interfaces/geo.repository';
import { DriverService } from './driver.service';

function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'd1',
    userId: 'u1',
    name: 'Alice',
    vehiclePlate: 'PLATE-1',
    vehicleModel: 'Toyota',
    status: DriverStatus.ONLINE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMocks() {
  const driverRepo: IDriverRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    updateStatus: vi.fn(),
    findManyByIdsAndStatus: vi.fn(),
    setOfflineIfOnline: vi.fn(),
  };
  const geoRepo: IGeoRepository = {
    addLocation: vi.fn(),
    removeDriver: vi.fn(),
    searchNearby: vi.fn(),
    checkPresence: vi.fn(),
    getStaleSince: vi.fn(),
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
  };
  return { driverRepo, geoRepo, service: new DriverService(driverRepo, geoRepo) };
}

describe('DriverService', () => {
  let driverRepo: IDriverRepository;
  let geoRepo: IGeoRepository;
  let service: DriverService;

  beforeEach(() => {
    ({ driverRepo, geoRepo, service } = makeMocks());
  });

  describe('create', () => {
    it('creates a driver when userId is free', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findByUserId).mockResolvedValue(null);
      vi.mocked(driverRepo.create).mockResolvedValue(driver);

      const input = {
        userId: 'u1',
        name: 'Alice',
        vehiclePlate: 'PLATE-1',
        vehicleModel: 'Toyota',
      };
      await expect(service.create(input)).resolves.toBe(driver);
      expect(driverRepo.create).toHaveBeenCalledWith(input);
    });

    it('throws DriverAlreadyExistsError when userId is taken', async () => {
      vi.mocked(driverRepo.findByUserId).mockResolvedValue(makeDriver());
      await expect(
        service.create({
          userId: 'u1',
          name: 'Alice',
          vehiclePlate: 'P',
          vehicleModel: 'M',
        }),
      ).rejects.toBeInstanceOf(DriverAlreadyExistsError);
      expect(driverRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the driver when found', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findById).mockResolvedValue(driver);
      await expect(service.findById('d1')).resolves.toBe(driver);
    });

    it('throws DriverNotFoundError when missing', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(null);
      await expect(service.findById('d1')).rejects.toBeInstanceOf(DriverNotFoundError);
    });
  });

  describe('findByUserId', () => {
    it('returns the driver when found', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findByUserId).mockResolvedValue(driver);
      await expect(service.findByUserId('u1')).resolves.toBe(driver);
    });

    it('throws DriverNotFoundError when missing', async () => {
      vi.mocked(driverRepo.findByUserId).mockResolvedValue(null);
      await expect(service.findByUserId('u1')).rejects.toBeInstanceOf(DriverNotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('removes the driver from geo when going OFFLINE', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findById).mockResolvedValue(driver);
      vi.mocked(driverRepo.updateStatus).mockResolvedValue(
        makeDriver({ status: DriverStatus.OFFLINE }),
      );

      await service.updateStatus('d1', DriverStatus.OFFLINE);
      expect(geoRepo.removeDriver).toHaveBeenCalledWith('d1');
      expect(driverRepo.updateStatus).toHaveBeenCalledWith('d1', DriverStatus.OFFLINE);
    });

    it('does not touch geo for a non-OFFLINE status', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(driverRepo.updateStatus).mockResolvedValue(
        makeDriver({ status: DriverStatus.ONLINE }),
      );

      await service.updateStatus('d1', DriverStatus.ONLINE);
      expect(geoRepo.removeDriver).not.toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    it('updates location for an ONLINE driver', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(
        makeDriver({ status: DriverStatus.ONLINE }),
      );
      await expect(service.updateLocation('d1', 10, 20)).resolves.toEqual({ ok: true });
      expect(geoRepo.addLocation).toHaveBeenCalledWith('d1', 10, 20);
    });

    it('updates location for a BUSY driver', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(
        makeDriver({ status: DriverStatus.BUSY }),
      );
      await expect(service.updateLocation('d1', 1, 2)).resolves.toEqual({ ok: true });
      expect(geoRepo.addLocation).toHaveBeenCalledWith('d1', 1, 2);
    });

    it('throws DriverNotAvailableError when OFFLINE', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(
        makeDriver({ status: DriverStatus.OFFLINE }),
      );
      await expect(service.updateLocation('d1', 1, 2)).rejects.toBeInstanceOf(
        DriverNotAvailableError,
      );
      expect(geoRepo.addLocation).not.toHaveBeenCalled();
    });
  });

  describe('findNearby', () => {
    it('returns an empty array when no candidates', async () => {
      vi.mocked(geoRepo.searchNearby).mockResolvedValue([]);
      await expect(service.findNearby(1, 2, 5, 10)).resolves.toEqual([]);
      expect(driverRepo.findManyByIdsAndStatus).not.toHaveBeenCalled();
      expect(geoRepo.checkPresence).not.toHaveBeenCalled();
    });

    it('keeps only presence-alive ONLINE candidates and maps results', async () => {
      vi.mocked(geoRepo.searchNearby).mockResolvedValue([
        { driverId: 'd1', distanceKm: 0.5 },
        { driverId: 'd2', distanceKm: 1.2 },
      ]);
      // d1 is alive, d2 is a ghost (presence expired)
      vi.mocked(geoRepo.checkPresence).mockResolvedValue(new Set(['d1']));
      vi.mocked(driverRepo.findManyByIdsAndStatus).mockResolvedValue([
        makeDriver({ id: 'd1', name: 'Alice', status: DriverStatus.ONLINE }),
      ]);

      const result = await service.findNearby(1, 2, 5, 10);
      expect(result).toEqual([
        {
          driverId: 'd1',
          name: 'Alice',
          vehiclePlate: 'PLATE-1',
          vehicleModel: 'Toyota',
          distanceKm: 0.5,
        },
      ]);
      // checkPresence called with all geo candidates
      expect(geoRepo.checkPresence).toHaveBeenCalledWith(['d1', 'd2']);
      // findManyByIdsAndStatus called only with presence-alive ids
      expect(driverRepo.findManyByIdsAndStatus).toHaveBeenCalledWith(
        ['d1'],
        DriverStatus.ONLINE,
      );
    });

    it('returns empty when all candidates are ghosts (presence expired)', async () => {
      vi.mocked(geoRepo.searchNearby).mockResolvedValue([
        { driverId: 'd1', distanceKm: 0.5 },
      ]);
      vi.mocked(geoRepo.checkPresence).mockResolvedValue(new Set());

      const result = await service.findNearby(1, 2, 5, 10);
      expect(result).toEqual([]);
      expect(driverRepo.findManyByIdsAndStatus).not.toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    it('marks driver BUSY and removes from geo when lock acquired', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(geoRepo.acquireLock).mockResolvedValue(true);
      vi.mocked(driverRepo.updateStatus).mockResolvedValue(
        makeDriver({ status: DriverStatus.BUSY }),
      );

      await expect(service.assign('d1')).resolves.toEqual({ ok: true });
      expect(driverRepo.updateStatus).toHaveBeenCalledWith('d1', DriverStatus.BUSY);
      expect(geoRepo.removeDriver).toHaveBeenCalledWith('d1');
      expect(geoRepo.releaseLock).not.toHaveBeenCalled();
    });

    it('returns ok:false when the lock is not acquired', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(geoRepo.acquireLock).mockResolvedValue(false);

      await expect(service.assign('d1')).resolves.toEqual({ ok: false });
      expect(driverRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('rolls back the lock and rethrows when updateStatus fails', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(geoRepo.acquireLock).mockResolvedValue(true);
      const boom = new Error('db down');
      vi.mocked(driverRepo.updateStatus).mockRejectedValue(boom);

      await expect(service.assign('d1')).rejects.toBe(boom);
      expect(geoRepo.releaseLock).toHaveBeenCalledWith('d1');
      expect(geoRepo.removeDriver).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('releases the lock and sets driver ONLINE', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(
        makeDriver({ status: DriverStatus.BUSY }),
      );
      vi.mocked(driverRepo.updateStatus).mockResolvedValue(
        makeDriver({ status: DriverStatus.ONLINE }),
      );

      const result = await service.release('d1');
      expect(geoRepo.releaseLock).toHaveBeenCalledWith('d1');
      expect(driverRepo.updateStatus).toHaveBeenCalledWith('d1', DriverStatus.ONLINE);
      expect(result.status).toBe(DriverStatus.ONLINE);
    });
  });
});
