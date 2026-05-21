import { Loader2, CarFront, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TripStatus } from '@rocket/contracts';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline';
type StatusIcon = typeof Loader2;

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; variant: BadgeVariant; Icon: StatusIcon; spin?: boolean }
> = {
  REQUESTED: { label: 'Finding driver…', variant: 'secondary', Icon: Loader2, spin: true },
  ASSIGNED: { label: 'Driver assigned', variant: 'default', Icon: CarFront },
  ONGOING: { label: 'On the way', variant: 'warning', Icon: Navigation },
  COMPLETED: { label: 'Completed', variant: 'success', Icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', Icon: XCircle },
  NO_DRIVER: { label: 'No driver available', variant: 'destructive', Icon: XCircle },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const { label, variant, Icon, spin } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon className={cn('h-3 w-3', spin && 'animate-spin')} aria-hidden="true" />
      {label}
    </Badge>
  );
}
