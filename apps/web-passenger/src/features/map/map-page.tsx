import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { LogOut } from 'lucide-react';
import { TripStatus } from '@rocket/contracts';
import { toast } from 'sonner';
import '@/features/map/leaflet-fix';
import 'leaflet/dist/leaflet.css';

import { MapClickHandler } from './map-click-handler';
import { TripPanel } from './trip-panel';
import { pickupIcon, dropoffIcon, driverIcon } from './map-markers';
import { useTripMutation } from './use-trip-mutation';
import { useTripSocket } from '@/features/trip/use-trip-socket';
import { useAuth } from '@/features/auth/auth-context';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/types/trip';

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // Ho Chi Minh City
const DEFAULT_ZOOM = 13;

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

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
    toast.info('Pickup set. Tap the map again to set your dropoff.');
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

  const hasTrip = !!activeTrip;

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar */}
      <header className="z-20 flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
        <BrandMark subtitle="Passenger" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-foreground sm:inline">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
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
            <Marker position={pickup} icon={pickupIcon}>
              <Popup>Pickup (A)</Popup>
            </Marker>
          )}

          {dropoff && (
            <Marker position={dropoff} icon={dropoffIcon}>
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

        {/* Floating glass panel */}
        <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-4">
          <TripPanel
            pickupSet={!!pickup}
            dropoffSet={!!dropoff}
            status={currentStatus}
            hasTrip={hasTrip}
            driverId={activeTrip?.driverId ?? null}
            isSearching={tripMutation.isPending}
            onFindDriver={handleFindDriver}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
