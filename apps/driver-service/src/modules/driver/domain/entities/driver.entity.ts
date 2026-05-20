/** Plain Driver entity — never imports Prisma types. */
export interface Driver {
  id: string;
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
