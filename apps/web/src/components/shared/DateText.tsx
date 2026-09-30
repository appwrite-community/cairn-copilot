import { Tooltip } from '@/components/ui/tooltip';
import { formatDateOnly, fullDateTime, relativeTime } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';

/** A relative time ("3h ago") with the full timestamp and time zone in a tooltip. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useNow();
  return (
    <Tooltip content={fullDateTime(iso)}>
      <time dateTime={iso} className={cn('whitespace-nowrap', className)}>
        {relativeTime(iso, now)}
      </time>
    </Tooltip>
  );
}

/** A calendar date (close, due, or renewal date) with the long form in a tooltip. */
export function CalendarDate({
  iso,
  className,
  children,
}: {
  iso: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Tooltip content={formatDateOnly(iso, 'long')}>
      <time dateTime={iso.slice(0, 10)} className={cn('whitespace-nowrap', className)}>
        {children ?? formatDateOnly(iso)}
      </time>
    </Tooltip>
  );
}
