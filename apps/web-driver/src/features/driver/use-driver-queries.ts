import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Driver } from '@/types/driver';
import type { DriverStatus } from '@rocket/contracts';

// Extended create input — contracts schema missing `name`, added locally per spec
export interface CreateDriverInput {
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
}

async function fetchDriverByUserId(userId: string): Promise<Driver> {
  const res = await apiClient.get<Driver>(`/drivers/by-user/${userId}`);
  return res.data;
}

async function createDriver(data: CreateDriverInput): Promise<Driver> {
  const res = await apiClient.post<Driver>('/drivers', data);
  return res.data;
}

async function updateDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
  const res = await apiClient.post<Driver>(`/drivers/${id}/status`, { status });
  return res.data;
}

async function updateDriverLocation(
  id: string,
  lat: number,
  lng: number,
): Promise<{ ok: boolean }> {
  const res = await apiClient.post<{ ok: boolean }>(`/drivers/${id}/location`, { lat, lng });
  return res.data;
}

export function useDriverByUserIdQuery(userId: string | null) {
  return useQuery({
    queryKey: ['driver', 'by-user', userId],
    queryFn: () => fetchDriverByUserId(userId!),
    enabled: !!userId,
    retry: (failureCount, error) => {
      // Do not retry on 404 — driver profile simply doesn't exist yet
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useCreateDriverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDriver,
    onSuccess: (driver) => {
      qc.setQueryData(['driver', 'by-user', driver.userId], driver);
    },
  });
}

export function useUpdateDriverStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DriverStatus }) =>
      updateDriverStatus(id, status),
    onSuccess: (driver) => {
      qc.setQueryData(['driver', 'by-user', driver.userId], driver);
    },
  });
}

export function useUpdateDriverLocationMutation() {
  return useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat: number; lng: number }) =>
      updateDriverLocation(id, lat, lng),
  });
}
