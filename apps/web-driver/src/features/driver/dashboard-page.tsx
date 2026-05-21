import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { Power, Loader2, Navigation, Square, CarFront, LogOut, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { DriverStatus } from '@rocket/contracts';
import '@/features/driver/leaflet-fix';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '@/features/auth/auth-context';
import {
  useDriverByUserIdQuery,
  useUpdateDriverStatusMutation,
  useUpdateDriverLocationMutation,
} from './use-driver-queries';
import { useAssignedTripQuery } from '@/features/trip/use-assigned-trip-query';
import { useTripSocket } from '@/features/trip/use-trip-socket';
import { CreateProfileForm } from './create-profile-form';
import { TripPanel } from '@/features/trip/trip-panel';
import { selfDriverIcon, pickupIcon, dropoffIcon } from './map-markers';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // Ho Chi Minh City
const DEFAULT_ZOOM = 14;
const LOCATION_SEND_INTERVAL_MS = 4_000;
const AUTO_DRIVE_STEP = 0.0003; // ~33m per tick

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

type BadgeVariant = 'success' | 'warning' | 'secondary';

function driverStatusMeta(status: DriverStatus): { variant: BadgeVariant; label: string } {
  switch (status) {
    case DriverStatus.ONLINE:
      return { variant: 'success', label: 'Online' };
    case DriverStatus.BUSY:
      return { variant: 'warning', label: 'On a trip' };
    default:
      return { variant: 'secondary', label: 'Offline' };
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

  // Loading state
  if (driverQuery.isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-emerald-50 to-green-100">
        <BrandMark subtitle="Driver" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your profile…
        </p>
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
  const status = driver ? driverStatusMeta(driver.status) : null;

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar */}
      <header className="z-20 flex items-center justify-between gap-3 border-b border-white/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <BrandMark subtitle="Driver" />
          {status && (
            <Badge variant={status.variant}>
              <Circle
                className={
                  driver?.status === DriverStatus.OFFLINE ? 'h-2 w-2' : 'h-2 w-2 fill-current'
                }
                aria-hidden="true"
              />
              {status.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            {driver && (
              <p className="text-xs text-muted-foreground">
                {driver.vehiclePlate} · {driver.vehicleModel}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
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
            icon={selfDriverIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = (e.target as LeafletMarker).getLatLng();
                setPosition([lat, lng]);
              },
            }}
          >
            <Popup>You are here. Drag to move.</Popup>
          </Marker>

          {/* Show pickup/dropoff markers when a trip is active */}
          {activeTrip && (
            <>
              <Marker position={[activeTrip.pickupLat, activeTrip.pickupLng]} icon={pickupIcon}>
                <Popup>Pickup (A)</Popup>
              </Marker>
              <Marker position={[activeTrip.dropoffLat, activeTrip.dropoffLng]} icon={dropoffIcon}>
                <Popup>Dropoff (B)</Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Control panel — bottom overlay */}
        <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-md -translate-x-1/2 space-y-2 px-4">
          {/* Active trip panel */}
          {activeTrip && <TripPanel trip={activeTrip} />}

          {/* Driver controls */}
          <Card className="border-white/70 bg-white/85 shadow-xl backdrop-blur-lg">
            <CardContent className="space-y-3 pt-6">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={isOnline ? 'destructive' : 'default'}
                  onClick={handleStatusToggle}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Power className="h-4 w-4" aria-hidden="true" />
                  )}
                  {updateStatusMutation.isPending
                    ? 'Updating…'
                    : isOnline
                      ? 'Go offline'
                      : 'Go online'}
                </Button>

                <Button
                  variant={autoDrive ? 'secondary' : 'outline'}
                  onClick={() => setAutoDrive((v) => !v)}
                  disabled={!isOnline}
                  title="Auto-drive simulates movement by nudging the marker every 2s"
                >
                  {autoDrive ? (
                    <Square className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                  )}
                  {autoDrive ? 'Stop' : 'Auto-drive'}
                </Button>
              </div>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                {isOnline ? (
                  <>
                    <CarFront className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Location sent every 4s. Drag the marker to move.
                  </>
                ) : (
                  'Go online to start accepting rides.'
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
