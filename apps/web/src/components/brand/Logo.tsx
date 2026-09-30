import { cn } from '@/lib/utils';

/** Cairn's mark: three stacked stones, the top one in Cairn Blue. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('size-6', className)}>
      <ellipse
        cx="12"
        cy="18.2"
        rx="8.6"
        ry="3.1"
        transform="rotate(-4 12 18.2)"
        fill="#ededf0"
        fillOpacity=".9"
      />
      <ellipse
        cx="11.3"
        cy="12.2"
        rx="6.2"
        ry="2.6"
        transform="rotate(5 11.3 12.2)"
        fill="#ededf0"
        fillOpacity=".6"
      />
      <ellipse
        cx="12.3"
        cy="6.8"
        rx="3.9"
        ry="2.4"
        transform="rotate(-12 12.3 6.8)"
        fill="#7fa7ff"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold leading-none tracking-[-0.02em] text-foreground">
        cairn
      </span>
    </span>
  );
}
