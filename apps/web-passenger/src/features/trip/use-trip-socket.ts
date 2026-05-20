import { useEffect, useRef, useState } from 'react';
import { joinTrip, leaveTrip, disconnectSocket } from '@/lib/socket';
import type { TripStatus } from '@rocket/contracts';
import type { DriverLocationEvent, TripUpdateEvent } from '@/types/trip';

interface TripSocketState {
  driverLocation: { lat: number; lng: number } | null;
  tripStatus: TripStatus | null;
}

export function useTripSocket(tripId: string | null, token: string | null): TripSocketState {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus | null>(null);
  const joinedTripId = useRef<string | null>(null);

  useEffect(() => {
    if (!tripId || !token) return;

    const socket = joinTrip(tripId, token);
    joinedTripId.current = tripId;

    const handleTripUpdate = (event: TripUpdateEvent) => {
      if (event.tripId === tripId) {
        setTripStatus(event.status);
      }
    };

    const handleDriverLocation = (event: DriverLocationEvent) => {
      setDriverLocation({ lat: event.lat, lng: event.lng });
    };

    socket.on('trip:update', handleTripUpdate);
    socket.on('driver:location', handleDriverLocation);

    return () => {
      socket.off('trip:update', handleTripUpdate);
      socket.off('driver:location', handleDriverLocation);
      if (joinedTripId.current) {
        leaveTrip(joinedTripId.current);
        joinedTripId.current = null;
      }
    };
  }, [tripId, token]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return { driverLocation, tripStatus };
}
