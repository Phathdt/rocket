import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { IDriverClient } from '../../domain/interfaces/driver-client';
import type { NearbyDriver, AssignResult } from '../../domain/interfaces/driver-client';

/**
 * Thin HTTP client wrapping all calls to Driver Service.
 * Abstraction point for a future gRPC migration — keep ALL Driver calls here.
 *
 * Driver Service endpoints (verified against driver-service impl):
 *   GET  /drivers/nearby?lat&lng&radiusKm&limit  → NearbyDriver[]  (bare array)
 *   POST /drivers/:id/assign                      → { ok: boolean }  (409 = lock taken)
 *   POST /drivers/:id/release                     → 200
 */
export class HttpDriverClient implements IDriverClient {
  private readonly logger = new Logger(HttpDriverClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    baseUrl: string,
  ) {
    this.baseUrl = baseUrl;
  }

  async findNearby(lat: number, lng: number, radiusKm = 5, limit = 5): Promise<NearbyDriver[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<NearbyDriver[]>(`${this.baseUrl}/drivers/nearby`, {
          params: { lat, lng, radiusKm, limit },
          timeout: 5000,
        }),
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      this.logger.warn(`findNearby failed (Driver Service unreachable?): ${(err as AxiosError).message}`);
      return [];
    }
  }

  async assign(driverId: string): Promise<AssignResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ ok: boolean }>(`${this.baseUrl}/drivers/${driverId}/assign`, {}, {
          timeout: 5000,
          validateStatus: (status) => status < 500,
        }),
      );
      // 409 = lock already taken by another trip
      if (response.status === 409) {
        return { ok: false };
      }
      return response.data ?? { ok: true };
    } catch (err) {
      this.logger.warn(`assign(${driverId}) failed: ${(err as AxiosError).message}`);
      return { ok: false };
    }
  }

  async release(driverId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/drivers/${driverId}/release`, {}, {
          timeout: 5000,
        }),
      );
    } catch (err) {
      // Non-fatal: log and continue — trip already completed/cancelled
      this.logger.warn(`release(${driverId}) failed (non-fatal): ${(err as AxiosError).message}`);
    }
  }
}
