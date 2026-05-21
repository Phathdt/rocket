import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { DriverStatus } from '@rocket/contracts';
import { DriverPrismaRepository } from '../../src/modules/driver/infrastructure/repositories/driver.prisma-repository';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

let prisma: PrismaService;
let repo: DriverPrismaRepository;

beforeAll(async () => {
  prisma = new PrismaService(inject('databaseUrl'));
  await prisma.onModuleInit();
  repo = new DriverPrismaRepository(prisma);
});

afterAll(async () => {
  await prisma.onModuleDestroy();
});

beforeEach(async () => {
  await prisma.driver.deleteMany();
});

const sample = {
  userId: 'user-1',
  name: 'Alice',
  vehiclePlate: 'PLATE-1',
  vehicleModel: 'Toyota',
};

describe('DriverPrismaRepository (integration)', () => {
  it('creates a driver and maps it to a plain entity', async () => {
    const driver = await repo.create(sample);

    expect(driver.id).toBeTypeOf('string');
    expect(driver.userId).toBe('user-1');
    expect(driver.name).toBe('Alice');
    expect(driver.vehiclePlate).toBe('PLATE-1');
    expect(driver.vehicleModel).toBe('Toyota');
    expect(driver.status).toBe(DriverStatus.OFFLINE);
    expect(driver.createdAt).toBeInstanceOf(Date);
    expect(driver.updatedAt).toBeInstanceOf(Date);
  });

  it('findById returns the driver when present', async () => {
    const created = await repo.create(sample);
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it('findById returns null when absent', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findByUserId returns the driver when present', async () => {
    const created = await repo.create(sample);
    const found = await repo.findByUserId('user-1');
    expect(found?.id).toBe(created.id);
  });

  it('findByUserId returns null when absent', async () => {
    expect(await repo.findByUserId('missing-user')).toBeNull();
  });

  it('updateStatus persists the new status', async () => {
    const created = await repo.create(sample);
    const updated = await repo.updateStatus(created.id, DriverStatus.ONLINE);
    expect(updated.status).toBe(DriverStatus.ONLINE);

    const reloaded = await repo.findById(created.id);
    expect(reloaded?.status).toBe(DriverStatus.ONLINE);
  });

  it('findManyByIdsAndStatus filters by id set and status', async () => {
    const online = await repo.create({ ...sample, userId: 'u-online' });
    const busy = await repo.create({ ...sample, userId: 'u-busy' });
    const offline = await repo.create({ ...sample, userId: 'u-offline' });
    await repo.updateStatus(online.id, DriverStatus.ONLINE);
    await repo.updateStatus(busy.id, DriverStatus.BUSY);

    const result = await repo.findManyByIdsAndStatus(
      [online.id, busy.id, offline.id],
      DriverStatus.ONLINE,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(online.id);
  });
});
