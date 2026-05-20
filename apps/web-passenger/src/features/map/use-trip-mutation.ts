import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateTripInput } from '@rocket/contracts';
import type { Trip } from '@/types/trip';

async function createTrip(data: CreateTripInput): Promise<Trip> {
  const res = await apiClient.post<Trip>('/trips', data);
  return res.data;
}

export function useTripMutation() {
  return useMutation({ mutationFn: createTrip });
}
