import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import { HttpDriverClient } from './http-driver.client';

const BASE_URL = 'http://driver-service.test';

function makeHttp() {
  return {
    get: vi.fn(),
    post: vi.fn(),
  } as unknown as HttpService & Record<string, ReturnType<typeof vi.fn>>;
}

describe('HttpDriverClient', () => {
  let http: ReturnType<typeof makeHttp>;
  let client: HttpDriverClient;

  beforeEach(() => {
    http = makeHttp();
    client = new HttpDriverClient(http, BASE_URL);
  });

  describe('findNearby', () => {
    it('returns the driver array on success', async () => {
      const drivers = [{ driverId: 'drv-1', distanceKm: 1 }];
      http.get.mockReturnValue(of({ data: drivers }));

      await expect(client.findNearby(10, 20)).resolves.toEqual(drivers);
      expect(http.get).toHaveBeenCalledWith(
        `${BASE_URL}/drivers/nearby`,
        expect.objectContaining({
          params: { lat: 10, lng: 20, radiusKm: 5, limit: 5 },
        }),
      );
    });

    it('returns [] when the response data is not an array', async () => {
      http.get.mockReturnValue(of({ data: { unexpected: true } }));
      await expect(client.findNearby(10, 20, 3, 2)).resolves.toEqual([]);
    });

    it('returns [] when the request throws', async () => {
      http.get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
      await expect(client.findNearby(10, 20)).resolves.toEqual([]);
    });
  });

  describe('assign', () => {
    it('returns the body when the server responds 200 with data', async () => {
      http.post.mockReturnValue(of({ status: 200, data: { ok: true } }));
      await expect(client.assign('drv-1')).resolves.toEqual({ ok: true });
      expect(http.post).toHaveBeenCalledWith(
        `${BASE_URL}/drivers/drv-1/assign`,
        {},
        expect.objectContaining({ timeout: 5000 }),
      );
    });

    it('defaults to { ok: true } when the 200 response has no body', async () => {
      http.post.mockReturnValue(of({ status: 200, data: undefined }));
      await expect(client.assign('drv-1')).resolves.toEqual({ ok: true });
    });

    it('returns { ok: false } on a 409 conflict', async () => {
      http.post.mockReturnValue(of({ status: 409, data: { ok: false } }));
      await expect(client.assign('drv-1')).resolves.toEqual({ ok: false });
    });

    it('returns { ok: false } when the request throws', async () => {
      http.post.mockReturnValue(throwError(() => new Error('timeout')));
      await expect(client.assign('drv-1')).resolves.toEqual({ ok: false });
    });
  });

  describe('release', () => {
    it('resolves on success', async () => {
      http.post.mockReturnValue(of({ status: 200, data: {} }));
      await expect(client.release('drv-1')).resolves.toBeUndefined();
      expect(http.post).toHaveBeenCalledWith(
        `${BASE_URL}/drivers/drv-1/release`,
        {},
        expect.objectContaining({ timeout: 5000 }),
      );
    });

    it('swallows errors (non-fatal)', async () => {
      http.post.mockReturnValue(throwError(() => new Error('boom')));
      await expect(client.release('drv-1')).resolves.toBeUndefined();
    });
  });
});
