import { useEffect, useRef } from 'react';
import { joinTrip, leaveTrip, disconnectSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import type { TripUpdateEvent } from '@/types/trip';

/**
 * Connects to the trip WebSocket room and invalidates the trip query
 * whenever a trip:update event arrives, keeping the UI in sync without
 * managing local state separately.
 */
export function useTripSocket(tripId: string | null, token: string | null): void {
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tripId || !token) return;

    const socket = joinTrip(tripId, token);
    joinedRef.current = tripId;

    const handleTripUpdate = (event: TripUpdateEvent) => {
      if (event.tripId === tripId) {
        void qc.invalidateQueries({ queryKey: ['trips'] });
      }
    };

    socket.on('trip:update', handleTripUpdate);

    return () => {
      socket.off('trip:update', handleTripUpdate);
      if (joinedRef.current) {
        leaveTrip(joinedRef.current);
        joinedRef.current = null;
      }
    };
  }, [tripId, token, qc]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);
}
