import { Loader2, RotateCcw, CarFront, CheckCircle2 } from 'lucide-react';
import { TripStatus } from '@rocket/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TripStatusBadge } from './trip-status-badge';

interface TripPanelProps {
  pickupSet: boolean;
  dropoffSet: boolean;
  status: TripStatus | null;
  hasTrip: boolean;
  driverId: string | null;
  isSearching: boolean;
  onFindDriver: () => void;
  onReset: () => void;
}

function RouteRow({
  letter,
  tone,
  label,
  done,
}: {
  letter: string;
  tone: 'brand' | 'primary';
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          tone === 'brand' ? 'bg-brand' : 'bg-primary',
        )}
      >
        {letter}
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {done ? (
        <span className="flex items-center gap-1 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Set
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Tap the map</span>
      )}
    </div>
  );
}

/** Floating glass panel over the map — trip planning, then live trip status. */
export function TripPanel({
  pickupSet,
  dropoffSet,
  status,
  hasTrip,
  driverId,
  isSearching,
  onFindDriver,
  onReset,
}: TripPanelProps) {
  const isNoDriver = status === TripStatus.NO_DRIVER;
  const isFinished = status === TripStatus.COMPLETED || status === TripStatus.CANCELLED;

  const hint = !pickupSet
    ? 'Tap the map to set your pickup point.'
    : !dropoffSet
      ? 'Tap the map to set your dropoff point.'
      : 'All set — request your ride.';

  return (
    <Card className="border-white/70 bg-white/85 shadow-xl backdrop-blur-lg">
      <CardContent className="pt-6">
        {!hasTrip && (
          <div className="space-y-4">
            <div className="space-y-2">
              <RouteRow letter="A" tone="brand" label="Pickup" done={pickupSet} />
              <RouteRow letter="B" tone="primary" label="Dropoff" done={dropoffSet} />
            </div>

            <p className="text-sm text-muted-foreground">{hint}</p>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={onFindDriver}
                disabled={!pickupSet || !dropoffSet || isSearching}
              >
                {isSearching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSearching ? 'Searching…' : 'Find driver'}
              </Button>
              {(pickupSet || dropoffSet) && (
                <Button variant="outline" size="icon" onClick={onReset} aria-label="Reset trip">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        )}

        {hasTrip && status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Trip status</span>
              <TripStatusBadge status={status} />
            </div>

            {isNoDriver && (
              <p className="text-sm text-muted-foreground">
                No drivers are available in your area right now. Please try again in a few minutes.
              </p>
            )}

            {driverId && !isNoDriver && (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CarFront className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Your driver is on the way</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Driver #{driverId.slice(0, 8)}
                  </p>
                </div>
              </div>
            )}

            {(isFinished || isNoDriver) && (
              <Button variant="outline" className="w-full" onClick={onReset}>
                Book another ride
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
