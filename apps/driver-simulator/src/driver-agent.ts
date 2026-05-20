// One agent = one simulated driver: login -> profile -> ONLINE -> location loop.

import { ApiClient, describeError, isAxiosError, type LoginResult } from './api-client.js';
import { nextPosition, randomStart, fmt, type LatLng } from './movement.js';
import type { SimConfig } from './config.js';

export class DriverAgent {
  readonly label: string;
  private readonly email: string;
  private readonly name: string;
  private token = '';
  private userId = '';
  private driverId = '';
  private position: LatLng;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly index: number,
    private readonly api: ApiClient,
    private readonly cfg: SimConfig,
  ) {
    this.label = `driver-${index}`;
    this.email = `sim-driver-${index}@rocket.dev`;
    this.name = `Sim Driver ${index}`;
    this.position = randomStart(cfg.center, cfg.radiusKm);
  }

  // Login, ensure driver profile, go ONLINE, start the location loop.
  async start(): Promise<void> {
    const auth: LoginResult = await this.api.loginOrRegister(
      this.email,
      this.cfg.password,
      this.name,
    );
    this.token = auth.accessToken;
    this.userId = auth.user.id;

    let profile = await this.api.getDriverByUser(this.token, this.userId);
    if (!profile) {
      profile = await this.api.createDriver(this.token, {
        userId: this.userId,
        name: this.name,
        vehiclePlate: `SIM-${String(this.index).padStart(4, '0')}`,
        vehicleModel: 'Simulator EV',
      });
    }
    this.driverId = profile.id;

    await this.api.setStatus(this.token, this.driverId, 'ONLINE');
    await this.api.updateLocation(this.token, this.driverId, this.position);
    this.log(`ONLINE (${fmt(this.position)})`);

    this.running = true;
    this.scheduleTick();
  }

  private scheduleTick(): void {
    this.timer = setTimeout(() => void this.tick(), this.cfg.intervalMs);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    this.position = nextPosition(this.position);
    try {
      await this.api.updateLocation(this.token, this.driverId, this.position);
      this.log(`tick (${fmt(this.position)})`);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await this.reLogin();
      } else {
        this.log(`location failed: ${describeError(err)}`);
      }
    }
    if (this.running) this.scheduleTick();
  }

  // Token may expire on long demo runs — refresh and retry next tick.
  private async reLogin(): Promise<void> {
    try {
      const auth = await this.api.loginOrRegister(this.email, this.cfg.password, this.name);
      this.token = auth.accessToken;
      this.log('re-logged in (token refreshed)');
    } catch (err) {
      this.log(`re-login failed: ${describeError(err)}`);
    }
  }

  // Stop the loop and set the driver OFFLINE.
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.token || !this.driverId) return;
    try {
      await this.api.setStatus(this.token, this.driverId, 'OFFLINE');
      this.log('OFFLINE');
    } catch (err) {
      this.log(`failed to go OFFLINE: ${describeError(err)}`);
    }
  }

  private log(msg: string): void {
    console.log(`[${this.label}] ${msg}`);
  }
}
