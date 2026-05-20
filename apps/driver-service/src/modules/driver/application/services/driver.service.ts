import { Logger } from '@nestjs/common';
import { DriverStatus } from '@rocket/contracts';
import type { CreateDriverInput } from '../../domain/dto/create-driver.schema';
import type { Driver } from '../../domain/entities/driver.entity';
import {
  DriverAlreadyExistsError,
  DriverNotAvailableError,
  DriverNotFoundError,
} from '../../domain/errors';
import type { IDriverRepository } from '../../domain/interfaces/driver.repository';
import type { IDriverService, NearbyDriverResult } from '../../domain/interfaces/driver.service';
import type { IGeoRepository } from '../../domain/interfaces/geo.repository';

export class DriverService implements IDriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    private readonly driverRepo: IDriverRepository,
    private readonly geoRepo: IGeoRepository,
  ) {}

  async create(data: CreateDriverInput & { name: string }): Promise<Driver> {
    const existing = await this.driverRepo.findByUserId(data.userId);
    if (existing) {
      throw new DriverAlreadyExistsError(data.userId);
    }
    return this.driverRepo.create(data);
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.driverRepo.findById(id);
    if (!driver) throw new DriverNotFoundError(`id=${id}`);
    return driver;
  }

  async findByUserId(userId: string): Promise<Driver> {
    const driver = await this.driverRepo.findByUserId(userId);
    if (!driver) throw new DriverNotFoundError(`userId=${userId}`);
    return driver;
  }

  async updateStatus(id: string, status: string): Promise<Driver> {
    await this.findById(id);

    if (status === DriverStatus.OFFLINE) {
      await this.geoRepo.removeDriver(id);
    }

    return this.driverRepo.updateStatus(id, status);
  }

  async updateLocation(id: string, lat: number, lng: number): Promise<{ ok: boolean }> {
    const driver = await this.findById(id);

    if (
      driver.status !== DriverStatus.ONLINE &&
      driver.status !== DriverStatus.BUSY
    ) {
      throw new DriverNotAvailableError(
        `Driver must be ONLINE or BUSY to update location (current: ${driver.status})`,
      );
    }

    await this.geoRepo.addLocation(id, lat, lng);
    return { ok: true };
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<NearbyDriverResult[]> {
    const candidates = await this.geoRepo.searchNearby(lat, lng, radiusKm, limit);
    if (candidates.length === 0) return [];

    // Filter: only keep ONLINE drivers (exclude BUSY / OFFLINE)
    const ids = candidates.map((c) => c.driverId);
    const drivers = await this.driverRepo.findManyByIdsAndStatus(ids, DriverStatus.ONLINE);

    const onlineIds = new Set(drivers.map((d) => d.id));

    return candidates
      .filter((c) => onlineIds.has(c.driverId))
      .map((c) => {
        const d = drivers.find((dr) => dr.id === c.driverId)!;
        return {
          driverId: d.id,
          name: d.name,
          vehiclePlate: d.vehiclePlate,
          vehicleModel: d.vehicleModel,
          distanceKm: c.distanceKm,
        };
      });
  }

  async assign(id: string): Promise<{ ok: boolean }> {
    await this.findById(id);

    const locked = await this.geoRepo.acquireLock(id);
    if (!locked) {
      return { ok: false };
    }

    try {
      await this.driverRepo.updateStatus(id, DriverStatus.BUSY);
      await this.geoRepo.removeDriver(id);
    } catch (err) {
      // Roll back lock on failure
      await this.geoRepo.releaseLock(id);
      throw err;
    }

    return { ok: true };
  }

  async release(id: string): Promise<Driver> {
    await this.findById(id);
    await this.geoRepo.releaseLock(id);
    return this.driverRepo.updateStatus(id, DriverStatus.ONLINE);
  }
}
