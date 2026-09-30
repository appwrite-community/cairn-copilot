import { Lock, ShieldCheck, Users } from 'lucide-react';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { Badge } from '@/components/ui/badge';
import { companyInitials, HEALTH_LABELS } from '@/lib/format';
import type { Visibility } from '@/lib/permissions';
import type { Health } from '@/lib/types';
import { cn } from '@/lib/utils';

const HEALTH_TONES = { healthy: 'success', watch: 'warning', at_risk: 'danger' } as const;

export function HealthBadge({ health }: { health: Health }) {
  return (
    <Badge tone={HEALTH_TONES[health]}>
      <span className="size-1.5 rounded-full bg-current" />
      {HEALTH_LABELS[health]}
    </Badge>
  );
}

/** Who can read a note, read from its permissions. */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  if (visibility === 'leadership') {
    return (
      <Badge tone="violet">
        <ShieldCheck />
        Leadership
      </Badge>
    );
  }
  if (visibility === 'private') {
    return (
      <Badge>
        <Lock />
        Only you
      </Badge>
    );
  }
  return (
    <Badge>
      <Users />
      Workspace
    </Badge>
  );
}

export function ConfidentialBadge() {
  return (
    <Badge tone="violet">
      <ShieldCheck />
      Confidential
    </Badge>
  );
}

/** Marks a record that Scout wrote for the user. */
export function ViaScout({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-primary/10 pl-0.5 pr-1.5 text-xs font-medium text-primary',
        className,
      )}
    >
      <ScoutMark size={16} className="bg-transparent ring-0" />
      via Scout
    </span>
  );
}

/** A company's initials in a rounded tile. */
export function AccountTile({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-lg bg-raised font-semibold text-muted-foreground ring-1 ring-inset ring-border-strong',
        size === 'sm' && 'size-7 text-[10px]',
        size === 'md' && 'size-8 text-[11px]',
        size === 'lg' && 'size-11 rounded-xl text-sm',
      )}
    >
      {companyInitials(name)}
    </span>
  );
}
