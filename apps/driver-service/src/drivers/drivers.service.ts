import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DriverStatus } from '@rocket/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from './geo.service';
import type { CreateDriverDto } from './dto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async create(dto: CreateDriverDto) {
    const existing = await this.prisma.driver.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        `Driver profile for userId=${dto.userId} already exists`,
      );
    }
    return this.prisma.driver.create({ data: dto });
  }

  async findById(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException(`Driver id=${id} not found`);
    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver)
      throw new NotFoundException(`Driver userId=${userId} not found`);
    return driver;
  }

  async updateStatus(id: string, status: string) {
    const driver = await this.findById(id);

    if (status === DriverStatus.OFFLINE) {
      await this.geo.removeDriver(id);
    }

    return this.prisma.driver.update({
      where: { id },
      data: { status },
    });
  }

  async updateLocation(id: string, lat: number, lng: number) {
    const driver = await this.findById(id);

    if (
      driver.status !== DriverStatus.ONLINE &&
      driver.status !== DriverStatus.BUSY
    ) {
      throw new ConflictException(
        `Driver must be ONLINE or BUSY to update location (current: ${driver.status})`,
      );
    }

    await this.geo.addLocation(id, lat, lng);
    return { ok: true };
  }

  async findNearby(lat: number, lng: number, radiusKm: number, limit: number) {
    const candidates = await this.geo.searchNearby(lat, lng, radiusKm, limit);
    if (candidates.length === 0) return [];

    // Filter: only keep ONLINE drivers (exclude BUSY / OFFLINE)
    const ids = candidates.map((c) => c.driverId);
    const drivers = await this.prisma.driver.findMany({
      where: {
        id: { in: ids },
        status: DriverStatus.ONLINE,
      },
    });

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

    const locked = await this.geo.acquireLock(id);
    if (!locked) {
      return { ok: false };
    }

    try {
      await this.prisma.driver.update({
        where: { id },
        data: { status: DriverStatus.BUSY },
      });
      await this.geo.removeDriver(id);
    } catch (err) {
      // Roll back lock on failure
      await this.geo.releaseLock(id);
      throw err;
    }

    return { ok: true };
  }

  async release(id: string) {
    await this.findById(id);
    await this.geo.releaseLock(id);
    return this.prisma.driver.update({
      where: { id },
      data: { status: DriverStatus.ONLINE },
    });
  }
}
