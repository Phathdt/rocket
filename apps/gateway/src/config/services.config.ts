import { registerAs } from '@nestjs/config';

export const servicesConfig = registerAs('services', () => ({
  userServiceUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3001',
  driverServiceUrl: process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002',
  tripServiceUrl: process.env.TRIP_SERVICE_URL ?? 'http://localhost:3003',
}));

export type ServicesConfig = ReturnType<typeof servicesConfig>;
