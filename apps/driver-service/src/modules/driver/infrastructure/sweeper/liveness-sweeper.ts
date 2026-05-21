import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IDriverRepository } from '../../domain/interfaces/driver.repository';
import type { IGeoRepository } from '../../domain/interfaces/geo.repository';

/**
 * How long (ms) since last ping before a driver is considered stale.
 * Must be > presence TTL (30 s) to avoid false positives.
 */
const STALE_THRESHOLD_MS = 120_000; // 2 minutes

/** Cron cadence for the sweep — every 2 minutes. */
const SWEEP_CRON = '*/2 * * * *';

/**
 * Background GC for the `drivers:locations` GEO set.
 *
 * Plain class — no @Injectable(). Wired via useFactory in driver.module.ts;
 * @nestjs/schedule's explorer discovers the @Cron method on the provider
 * instance (it scans all provider instances, factory-created included).
 *
 * Sweep logic:
 *  1. Find drivers whose `drivers:lastseen` score is older than STALE_THRESHOLD_MS.
 *  2. ZREM them from `drivers:locations` and `drivers:lastseen`.
 *  3. Set Postgres status=OFFLINE **only if currently ONLINE** (never clobbers BUSY).
 */
export class LivenessSweeper {
  private readonly logger = new Logger(LivenessSweeper.name);

  constructor(
    private readonly geoRepo: IGeoRepository,
    private readonly driverRepo: IDriverRepository,
  ) {}

  /** Runs on the SWEEP_CRON schedule. Also callable directly in tests. */
  @Cron(SWEEP_CRON, { name: 'liveness-sweep' })
  async sweep(): Promise<void> {
    try {
      const cutoff = Date.now() - STALE_THRESHOLD_MS;
      const staleIds = await this.geoRepo.getStaleSince(cutoff);

      if (staleIds.length === 0) return;

      let removed = 0;

      for (const driverId of staleIds) {
        try {
          await this.geoRepo.removeDriver(driverId);
          await this.driverRepo.setOfflineIfOnline(driverId);
          removed++;
        } catch (err) {
          this.logger.warn(
            `Sweeper failed to evict driverId=${driverId}: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Liveness sweep complete — removed ${removed}/${staleIds.length} stale drivers`,
      );
    } catch (err) {
      // A sweep failure must NOT crash the service
      this.logger.error(`Liveness sweep error: ${(err as Error).message}`);
    }
  }
}
