import { Flash } from '@/components/Flash';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { CalendarDate, RelativeTime } from '@/components/shared/DateText';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, STAGE_LABELS } from '@/lib/format';
import type { Deal } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StageIcon } from './StageIcon';

/** A deal in the account page's right rail. */
export function DealCard({ deal, onOpen }: { deal: Deal; onOpen?: () => void }) {
  return (
    <div
      data-row-id={deal.$id}
      className="relative rounded-lg border border-border bg-background/40 p-3"
    >
      <Flash rowId={deal.$id} />
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="min-w-0 text-left text-sm font-medium leading-5 outline-none hover:underline hover:underline-offset-4 focus-visible:underline disabled:no-underline"
        >
          {deal.name}
        </button>
        <span className="shrink-0 text-sm font-medium tabular">{formatCurrency(deal.amount)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <StageIcon stage={deal.stage} />
          {STAGE_LABELS[deal.stage]}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-subtle">Close</span>
          <CalendarDate iso={deal.closeDate} />
        </span>
        <span className="flex items-center gap-1.5">
          <Avatar name={deal.ownerName} size="xs" />
          {deal.ownerName}
        </span>
      </div>
      {deal.nextStep && (
        <p className="mt-2.5 border-t border-border pt-2.5 text-xs leading-[18px] text-muted-foreground">
          <span className="text-subtle">Next step: </span>
          {deal.nextStep}
        </p>
      )}
      {deal.updatedVia === 'scout' && deal.updatedByName && <UpdatedByScout deal={deal} />}
    </div>
  );
}

export function UpdatedByScout({ deal, className }: { deal: Deal; className?: string }) {
  return (
    <p className={cn('mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <ScoutMark size={16} />
      <span>
        Updated by {deal.updatedByName} via Scout ·{' '}
        <RelativeTime iso={deal.$updatedAt} className="text-subtle" />
      </span>
    </p>
  );
}
