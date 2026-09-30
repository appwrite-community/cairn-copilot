import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SegmentedOption<T> = { value: T; label: ReactNode };

/** A row of mutually exclusive options, such as a filter. */
export function Segmented<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value ?? 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60',
              active
                ? 'bg-raised text-foreground shadow-[inset_0_0_0_1px_var(--color-border-strong)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
