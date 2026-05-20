import { Badge } from '@/components/ui/badge';
import type { TripStatus } from '@rocket/contracts';

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }
> = {
  REQUESTED: { label: 'Finding driver…', variant: 'secondary' },
  ASSIGNED: { label: 'Driver assigned', variant: 'default' },
  ONGOING: { label: 'On the way', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  NO_DRIVER: { label: 'No driver available', variant: 'destructive' },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
