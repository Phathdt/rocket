import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { DriverStatus } from '@rocket/contracts';
import '@/features/driver/leaflet-fix';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '@/features/auth/auth-context';
import { useDriverByUserIdQuery, useUpdateDriverStatusMutation, useUpdateDriverLocationMutation } from './use-driver-queries';
import { useAssignedTripQuery } from '@/features/trip/use-assigned-trip-query';
import { useTripSocket } from '@/features/trip/use-trip-socket';
import { CreateProfileForm } from './create-profile-form';
import { TripPanel } from '@/features/trip/trip-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // Ho Chi Minh City
const DEFAULT_ZOOM = 14;
const LOCATION_SEND_INTERVAL_MS = 4_000;
const AUTO_DRIVE_STEP = 0.0003; // ~33m per tick

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Custom driver marker icon
const driverIcon = L.divIcon({
  html: '🚗',
  className: 'driver-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function statusVariant(status: string) {
  switch (status) {
    case DriverStatus.ONLINE:
      return 'success' as const;
    case DriverStatus.BUSY:
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

export function DashboardPage() {
  const { user, accessToken, logout } = useAuth();
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [autoDrive, setAutoDrive] = useState(false);
  const autoDriveRef = useRef(autoDrive);
  autoDriveRef.current = autoDrive;

  const driverQuery = useDriverByUserIdQuery(user?.id ?? null);
  const driver = driverQuery.data;

  const updateStatusMutation = useUpdateDriverStatusMutation();
  const updateLocationMutation = useUpdateDriverLocationMutation();

  const assignedTripQuery = useAssignedTripQuery(driver?.id ?? null);
  const activeTrip = assignedTripQuery.data ?? null;

  // Connect WebSocket for trip:update events when there is an active trip
  useTripSocket(activeTrip?.id ?? null, accessToken);

  // Ref keeps the latest position so the interval closure never goes stale
  const positionRef = useRef(position);
  positionRef.current = position;

  // Send location to backend at interval when ONLINE or BUSY
  useEffect(() => {
    if (!driver || driver.status === DriverStatus.OFFLINE) return;

    const interval = setInterval(() => {
      const [lat, lng] = positionRef.current;
      updateLocationMutation.mutate({ id: driver.id, lat, lng });
    }, LOCATION_SEND_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id, driver?.status]);

  // Auto-drive: nudge position slightly on each tick
  useEffect(() => {
    if (!autoDrive) return;
    const interval = setInterval(() => {
      setPosition(([lat, lng]) => [lat + AUTO_DRIVE_STEP, lng + AUTO_DRIVE_STEP * 0.6]);
    }, 2_000);
    return () => clearInterval(interval);
  }, [autoDrive]);

  const handleStatusToggle = useCallback(() => {
    if (!driver) return;
    const next =
      driver.status === DriverStatus.OFFLINE ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
    updateStatusMutation.mutate(
      { id: driver.id, status: next },
      {
        onSuccess: () => toast.success(`You are now ${next}`),
        onError: () => toast.error('Failed to update status.'),
      },
    );
  }, [driver, updateStatusMutation]);

  // Loading / error state
  if (driverQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading driver profile…</p>
      </div>
    );
  }

  // 404 or no profile yet — show creation form
  const is404 =
    driverQuery.isError &&
    driverQuery.error &&
    typeof driverQuery.error === 'object' &&
    'response' in driverQuery.error &&
    (driverQuery.error as { response?: { status?: number } }).response?.status === 404;

  if (is404 || (!driverQuery.isLoading && !driver)) {
    return <CreateProfileForm />;
  }

  const isOnline = driver?.status !== DriverStatus.OFFLINE;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">Rocket</span>
          <span className="text-sm text-muted-foreground">Driver</span>
          {driver && (
            <Badge variant={statusVariant(driver.status)} className="ml-1">
              {driver.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{user?.name}</span>
          {driver && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {driver.vehiclePlate} · {driver.vehicleModel}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Map area */}
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

          <Marker
            position={position}
            icon={driverIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                setPosition([lat, lng]);
              },
            }}
          >
            <Popup>You are here. Drag to move.</Popup>
          </Marker>

          {/* Show pickup/dropoff markers when a trip is active */}
          {activeTrip && (
            <>
              <Marker position={[activeTrip.pickupLat, activeTrip.pickupLng]}>
                <Popup>Pickup</Popup>
              </Marker>
              <Marker position={[activeTrip.dropoffLat, activeTrip.dropoffLng]}>
                <Popup>Dropoff</Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Control panel — bottom overlay */}
        <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-sm -translate-x-1/2 space-y-2 px-4">
          {/* Active trip panel */}
          {activeTrip && <TripPanel trip={activeTrip} />}

          {/* Driver controls */}
          <Card className="shadow-lg">
            <CardContent className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={isOnline ? 'destructive' : 'default'}
                  onClick={handleStatusToggle}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending
                    ? 'Updating…'
                    : isOnline
                      ? 'Go Offline'
                      : 'Go Online'}
                </Button>

                <Button
                  variant={autoDrive ? 'secondary' : 'outline'}
                  onClick={() => setAutoDrive((v) => !v)}
                  disabled={!isOnline}
                  title="Auto-drive simulates movement by nudging the marker every 2s"
                >
                  {autoDrive ? 'Stop auto' : 'Auto-drive'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {isOnline
                  ? 'Location sent every 4s. Drag the marker to change position.'
                  : 'Go online to start accepting rides.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
