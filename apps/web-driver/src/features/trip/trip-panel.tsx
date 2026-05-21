import { Loader2, CarFront, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TripStatus } from '@rocket/contracts';
import { useStartTripMutation, useCompleteTripMutation } from './use-assigned-trip-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';

interface TripPanelProps {
  trip: Trip;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning';
type StatusIcon = typeof Loader2;

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; variant: BadgeVariant; Icon: StatusIcon; spin?: boolean }
> = {
  REQUESTED: { label: 'Requested', variant: 'secondary', Icon: Loader2, spin: true },
  ASSIGNED: { label: 'Assigned to you', variant: 'warning', Icon: CarFront },
  ONGOING: { label: 'In progress', variant: 'default', Icon: Navigation },
  COMPLETED: { label: 'Completed', variant: 'success', Icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', Icon: XCircle },
  NO_DRIVER: { label: 'No driver', variant: 'destructive', Icon: XCircle },
};

function EndpointRow({
  letter,
  tone,
  label,
  lat,
  lng,
}: {
  letter: string;
  tone: 'brand' | 'accent';
  label: string;
  lat: number;
  lng: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          tone === 'brand' ? 'bg-brand' : 'bg-[#2563eb]',
        )}
      >
        {letter}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium tabular-nums text-foreground">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>
    </div>
  );
}

export function TripPanel({ trip }: TripPanelProps) {
  const startMutation = useStartTripMutation();
  const completeMutation = useCompleteTripMutation();

  const { label, variant, Icon, spin } = STATUS_CONFIG[trip.status];

  const handleStart = () => {
    startMutation.mutate(trip.id, {
      onSuccess: () => toast.success('Trip started!'),
      onError: () => toast.error('Failed to start trip.'),
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(trip.id, {
      onSuccess: () => toast.success('Trip completed!'),
      onError: () => toast.error('Failed to complete trip.'),
    });
  };

  return (
    <Card className="border-white/70 bg-white/85 shadow-xl backdrop-blur-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Assigned trip</CardTitle>
          <Badge variant={variant}>
            <Icon className={cn('h-3 w-3', spin && 'animate-spin')} aria-hidden="true" />
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <EndpointRow
            letter="A"
            tone="brand"
            label="Pickup"
            lat={trip.pickupLat}
            lng={trip.pickupLng}
          />
          <EndpointRow
            letter="B"
            tone="accent"
            label="Dropoff"
            lat={trip.dropoffLat}
            lng={trip.dropoffLng}
          />
        </div>

        {trip.status === TripStatus.ASSIGNED && (
          <Button className="w-full" onClick={handleStart} disabled={startMutation.isPending}>
            {startMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {startMutation.isPending ? 'Starting…' : 'Start trip'}
          </Button>
        )}
        {trip.status === TripStatus.ONGOING && (
          <Button className="w-full" onClick={handleComplete} disabled={completeMutation.isPending}>
            {completeMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {completeMutation.isPending ? 'Completing…' : 'Complete trip'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
