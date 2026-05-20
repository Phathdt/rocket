import { toast } from 'sonner';
import { TripStatus } from '@rocket/contracts';
import { useStartTripMutation, useCompleteTripMutation } from './use-assigned-trip-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Trip } from '@/types/trip';

interface TripPanelProps {
  trip: Trip;
}

function statusVariant(status: string) {
  switch (status) {
    case TripStatus.ASSIGNED:
      return 'warning' as const;
    case TripStatus.ONGOING:
      return 'default' as const;
    case TripStatus.COMPLETED:
      return 'success' as const;
    default:
      return 'secondary' as const;
  }
}

export function TripPanel({ trip }: TripPanelProps) {
  const startMutation = useStartTripMutation();
  const completeMutation = useCompleteTripMutation();

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
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Assigned Trip</CardTitle>
          <Badge variant={statusVariant(trip.status)}>{trip.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="font-mono text-xs">
              {trip.pickupLat.toFixed(5)}, {trip.pickupLng.toFixed(5)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dropoff</p>
            <p className="font-mono text-xs">
              {trip.dropoffLat.toFixed(5)}, {trip.dropoffLng.toFixed(5)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {trip.status === TripStatus.ASSIGNED && (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? 'Starting…' : 'Start trip'}
            </Button>
          )}
          {trip.status === TripStatus.ONGOING && (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completing…' : 'Complete trip'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
