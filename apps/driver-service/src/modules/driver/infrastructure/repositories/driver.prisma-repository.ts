import { DriverStatus } from '@rocket/contracts';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { Driver } from '../../domain/entities/driver.entity';
import { IDriverRepository } from '../../domain/interfaces/driver.repository';

/** Maps a Prisma Driver row to the plain Driver entity. */
function toEntity(row: {
  id: string;
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Driver {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    vehiclePlate: row.vehiclePlate,
    vehicleModel: row.vehicleModel,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DriverPrismaRepository extends IDriverRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: {
    userId: string;
    name: string;
    vehiclePlate: string;
    vehicleModel: string;
  }): Promise<Driver> {
    const row = await this.prisma.driver.create({ data });
    return toEntity(row);
  }

  async findById(id: string): Promise<Driver | null> {
    const row = await this.prisma.driver.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    const row = await this.prisma.driver.findUnique({ where: { userId } });
    return row ? toEntity(row) : null;
  }

  async updateStatus(id: string, status: string): Promise<Driver> {
    const row = await this.prisma.driver.update({
      where: { id },
      data: { status },
    });
    return toEntity(row);
  }

  async findManyByIdsAndStatus(ids: string[], status: string): Promise<Driver[]> {
    const rows = await this.prisma.driver.findMany({
      where: { id: { in: ids }, status },
    });
    return rows.map(toEntity);
  }

  async setOfflineIfOnline(id: string): Promise<void> {
    await this.prisma.driver.updateMany({
      where: { id, status: DriverStatus.ONLINE },
      data: { status: DriverStatus.OFFLINE },
    });
  }
}
