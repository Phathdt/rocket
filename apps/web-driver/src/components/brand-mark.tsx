import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Small caption shown under the wordmark (e.g. "Driver"). */
  subtitle?: string;
  className?: string;
}

/** Rocket logo lockup — orange icon tile + wordmark. Shared by auth and dashboard. */
export function BrandMark({ subtitle, className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
        <Rocket className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          Rocket
        </span>
        {subtitle && <span className="text-xs font-medium text-muted-foreground">{subtitle}</span>}
      </span>
    </div>
  );
}
