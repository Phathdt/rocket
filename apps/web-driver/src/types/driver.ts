import type { DriverStatus } from '@rocket/contracts';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}
