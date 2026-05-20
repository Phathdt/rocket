import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TripStatus } from '@rocket/contracts';
import type { Trip } from '@/types/trip';

async function fetchDriverTrips(driverId: string): Promise<Trip[]> {
  const res = await apiClient.get<Trip[]>(`/trips?driverId=${driverId}`);
  return res.data;
}

async function startTrip(tripId: string): Promise<Trip> {
  const res = await apiClient.post<Trip>(`/trips/${tripId}/start`);
  return res.data;
}

async function completeTrip(tripId: string): Promise<Trip> {
  const res = await apiClient.post<Trip>(`/trips/${tripId}/complete`);
  return res.data;
}

/** Poll for the driver's active trip (ASSIGNED or ONGOING). */
export function useAssignedTripQuery(driverId: string | null) {
  return useQuery({
    queryKey: ['trips', 'driver', driverId],
    queryFn: async () => {
      const trips = await fetchDriverTrips(driverId!);
      return (
        trips.find(
          (t) => t.status === TripStatus.ASSIGNED || t.status === TripStatus.ONGOING,
        ) ?? null
      );
    },
    enabled: !!driverId,
    refetchInterval: 5_000,
  });
}

export function useStartTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startTrip,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useCompleteTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeTrip,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
