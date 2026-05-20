import type { Driver } from '../entities/driver.entity';

export abstract class IDriverRepository {
  abstract create(data: {
    userId: string;
    name: string;
    vehiclePlate: string;
    vehicleModel: string;
  }): Promise<Driver>;

  abstract findById(id: string): Promise<Driver | null>;

  abstract findByUserId(userId: string): Promise<Driver | null>;

  abstract updateStatus(id: string, status: string): Promise<Driver>;

  abstract findManyByIdsAndStatus(ids: string[], status: string): Promise<Driver[]>;
}
