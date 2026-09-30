import { cn } from '@/lib/utils';

/** Scout's mark: Cairn's top stone on a Cairn Blue tile. Shown wherever Scout acts. */
export function ScoutMark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[6px] bg-primary/14 ring-1 ring-inset ring-primary/20',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.72, height: size * 0.72 }}>
        <ellipse cx="12" cy="12" rx="8.6" ry="5.3" transform="rotate(-12 12 12)" fill="#7fa7ff" />
      </svg>
    </span>
  );
}
