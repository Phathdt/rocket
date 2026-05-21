import { Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  DriverServiceClient,
  DRIVER_SERVICE_NAME,
  NearbyDriver as GrpcNearbyDriver,
} from '@rocket/proto';
import { IDriverClient } from '../../domain/interfaces/driver-client';
import type { NearbyDriver, AssignResult } from '../../domain/interfaces/driver-client';

const CALL_TIMEOUT_MS = 5000;

/**
 * gRPC implementation of IDriverClient.
 * Calls driver-service over gRPC with a 5-second deadline per call.
 * Graceful degradation mirrors HttpDriverClient:
 *   - findNearby failure → []
 *   - assign failure    → { ok: false }
 *   - release failure   → non-fatal (log + continue)
 */
export class GrpcDriverClient implements IDriverClient, OnModuleInit {
  private readonly logger = new Logger(GrpcDriverClient.name);
  private svc!: DriverServiceClient;

  constructor(private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.svc = this.client.getService<DriverServiceClient>(DRIVER_SERVICE_NAME);
  }

  async findNearby(lat: number, lng: number, radiusKm = 5, limit = 5): Promise<NearbyDriver[]> {
    try {
      const res = await firstValueFrom(
        this.svc.findNearby({ lat, lng, radiusKm, limit }).pipe(timeout(CALL_TIMEOUT_MS)),
      );
      return (res.drivers ?? []).map((d: GrpcNearbyDriver) => ({
        driverId: d.driverId,
        distanceKm: d.distanceKm,
      }));
    } catch (err) {
      this.logger.warn(`gRPC findNearby failed: ${(err as Error).message}`);
      return [];
    }
  }

  async assign(driverId: string): Promise<AssignResult> {
    try {
      const res = await firstValueFrom(
        this.svc.assign({ driverId }).pipe(timeout(CALL_TIMEOUT_MS)),
      );
      return { ok: res.ok ?? false };
    } catch (err) {
      this.logger.warn(`gRPC assign(${driverId}) failed: ${(err as Error).message}`);
      return { ok: false };
    }
  }

  async release(driverId: string): Promise<void> {
    try {
      await firstValueFrom(this.svc.release({ driverId }).pipe(timeout(CALL_TIMEOUT_MS)));
    } catch (err) {
      // Non-fatal: log and continue — trip already completed/cancelled
      this.logger.warn(`gRPC release(${driverId}) failed (non-fatal): ${(err as Error).message}`);
    }
  }
}
