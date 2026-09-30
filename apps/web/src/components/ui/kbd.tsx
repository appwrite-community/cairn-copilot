import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** A keyboard key. Hidden on touch screens, where shortcuts do not apply. */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded border pointer-coarse:hidden border-border-strong bg-background/60 px-1 font-mono text-[11px] font-medium text-subtle',
        className,
      )}
      {...props}
    />
  );
}
