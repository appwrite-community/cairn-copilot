import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const sizes = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
  lg: 'size-9 text-xs',
};

/** Initials in a neutral circle. Cairn has no profile photos. */
export function Avatar({
  name,
  size = 'sm',
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 select-none place-items-center rounded-full bg-[#26262d] font-semibold tracking-wide text-muted-foreground ring-1 ring-inset ring-white/6',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
