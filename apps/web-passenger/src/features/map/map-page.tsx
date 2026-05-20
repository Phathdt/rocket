import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import L from 'leaflet';
import { TripStatus } from '@rocket/contracts';
import { toast } from 'sonner';
import '@/features/map/leaflet-fix';
import 'leaflet/dist/leaflet.css';

import { MapClickHandler } from './map-click-handler';
import { TripStatusBadge } from './trip-status-badge';
import { useTripMutation } from './use-trip-mutation';
import { useTripSocket } from '@/features/trip/use-trip-socket';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Trip } from '@/types/trip';

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // Ho Chi Minh City
const DEFAULT_ZOOM = 13;

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const driverIcon = L.divIcon({
  html: '🚗',
  className: 'driver-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export function MapPage() {
  const { accessToken, user, logout } = useAuth();
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  const tripMutation = useTripMutation();

  const effectiveTripId = activeTrip?.id ?? null;
  const { driverLocation, tripStatus } = useTripSocket(effectiveTripId, accessToken);

  const currentStatus = tripStatus ?? activeTrip?.status ?? null;

  const handlePickup = useCallback((latlng: LatLng) => {
    setPickup(latlng);
    toast.info('Pickup set. Click map again to set dropoff.');
  }, []);

  const handleDropoff = useCallback((latlng: LatLng) => {
    setDropoff(latlng);
    toast.info('Dropoff set. Ready to find a driver!');
  }, []);

  const handleReset = () => {
    setPickup(null);
    setDropoff(null);
    setActiveTrip(null);
  };

  const handleFindDriver = () => {
    if (!pickup || !dropoff) return;

    tripMutation.mutate(
      {
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      },
      {
        onSuccess: (trip) => {
          setActiveTrip(trip);
          if (trip.status === TripStatus.NO_DRIVER) {
            toast.warning('No drivers available nearby. Please try again later.');
          } else {
            toast.success('Trip requested! Looking for your driver…');
          }
        },
        onError: () => {
          toast.error('Failed to request trip. Please try again.');
        },
      },
    );
  };

  const isSearching = tripMutation.isPending;
  const hasTrip = !!activeTrip;
  const isNoDriver = currentStatus === TripStatus.NO_DRIVER;
  const isCompleted =
    currentStatus === TripStatus.COMPLETED || currentStatus === TripStatus.CANCELLED;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">Rocket</span>
          <span className="text-sm text-muted-foreground">Passenger</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            url={TILE_URL}
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />

          {!hasTrip && (
            <MapClickHandler
              onPickup={handlePickup}
              onDropoff={handleDropoff}
              pickupSet={!!pickup}
              dropoffSet={!!dropoff}
            />
          )}

          {pickup && (
            <Marker position={pickup}>
              <Popup>Pickup (A)</Popup>
            </Marker>
          )}

          {dropoff && (
            <Marker position={dropoff}>
              <Popup>Dropoff (B)</Popup>
            </Marker>
          )}

          {driverLocation && (
            <>
              <RecenterMap center={[driverLocation.lat, driverLocation.lng]} />
              <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                <Popup>Your driver</Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Floating bottom panel */}
        <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-sm -translate-x-1/2 px-4">
          <Card className="shadow-lg">
            <CardContent className="pt-4">
              {!hasTrip && (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {!pickup
                      ? 'Click the map to set your pickup point (A).'
                      : !dropoff
                        ? 'Click the map to set your dropoff point (B).'
                        : 'Ready! Click "Find driver" to request a ride.'}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleFindDriver}
                      disabled={!pickup || !dropoff || isSearching}
                    >
                      {isSearching ? 'Searching…' : 'Find driver'}
                    </Button>
                    {(pickup || dropoff) && (
                      <Button variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                    )}
                  </div>
                </>
              )}

              {hasTrip && currentStatus && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trip status</span>
                    <TripStatusBadge status={currentStatus} />
                  </div>

                  {isNoDriver && (
                    <p className="text-sm text-muted-foreground">
                      No drivers are available in your area right now. Please try again in a few
                      minutes.
                    </p>
                  )}

                  {activeTrip.driverId && !isNoDriver && (
                    <p className="text-xs text-muted-foreground">
                      Driver ID: {activeTrip.driverId}
                    </p>
                  )}

                  {(isCompleted || isNoDriver) && (
                    <Button variant="outline" className="w-full" onClick={handleReset}>
                      Book another ride
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
