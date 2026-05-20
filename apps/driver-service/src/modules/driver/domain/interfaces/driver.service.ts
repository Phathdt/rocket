import type { Driver } from '../entities/driver.entity';
import type { NearbyDriver } from './geo.repository';
import type { CreateDriverInput } from '../dto/create-driver.schema';

export interface NearbyDriverResult extends NearbyDriver {
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
}

export abstract class IDriverService {
  abstract create(data: CreateDriverInput & { name: string }): Promise<Driver>;

  abstract findById(id: string): Promise<Driver>;

  abstract findByUserId(userId: string): Promise<Driver>;

  abstract updateStatus(id: string, status: string): Promise<Driver>;

  abstract updateLocation(id: string, lat: number, lng: number): Promise<{ ok: boolean }>;

  abstract findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<NearbyDriverResult[]>;

  abstract assign(id: string): Promise<{ ok: boolean }>;

  abstract release(id: string): Promise<Driver>;
}
