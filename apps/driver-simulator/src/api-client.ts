// Thin axios wrapper around the API Gateway REST endpoints.

import axios, { AxiosInstance, isAxiosError } from 'axios';
import type { LatLng } from './movement.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  status?: string;
}

export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export class ApiClient {
  private readonly http: AxiosInstance;

  constructor(gateway: string) {
    this.http = axios.create({ baseURL: gateway, timeout: 10000 });
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await this.http.post<LoginResult>('/auth/login', { email, password });
    return data;
  }

  async register(
    email: string,
    password: string,
    name: string,
    role = 'DRIVER',
  ): Promise<LoginResult> {
    const { data } = await this.http.post<LoginResult>('/auth/register', {
      email,
      password,
      name,
      role,
    });
    return data;
  }

  // Login if the account exists, otherwise register it.
  async loginOrRegister(email: string, password: string, name: string): Promise<LoginResult> {
    try {
      return await this.login(email, password);
    } catch (err) {
      if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 404)) {
        return await this.register(email, password, name);
      }
      throw err;
    }
  }

  async getDriverByUser(token: string, userId: string): Promise<DriverProfile | null> {
    try {
      const { data } = await this.http.get<DriverProfile>(`/drivers/by-user/${userId}`, {
        headers: this.auth(token),
      });
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  }

  async createDriver(
    token: string,
    body: { userId: string; name: string; vehiclePlate: string; vehicleModel: string },
  ): Promise<DriverProfile> {
    const { data } = await this.http.post<DriverProfile>('/drivers', body, {
      headers: this.auth(token),
    });
    return data;
  }

  async setStatus(token: string, driverId: string, status: DriverStatus): Promise<void> {
    await this.http.post(
      `/drivers/${driverId}/status`,
      { status },
      { headers: this.auth(token) },
    );
  }

  async updateLocation(token: string, driverId: string, pos: LatLng): Promise<void> {
    await this.http.post(
      `/drivers/${driverId}/location`,
      { lat: pos.lat, lng: pos.lng },
      { headers: this.auth(token) },
    );
  }

  private auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }
}

// Friendly one-line error description for logs.
export function describeError(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const body = err.response?.data;
    const msg =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: unknown }).message
        : err.message;
    return `HTTP ${status ?? '?'} ${JSON.stringify(msg)}`;
  }
  return err instanceof Error ? err.message : String(err);
}

export { isAxiosError };
