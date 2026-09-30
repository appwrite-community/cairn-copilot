import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Status colors at 14% over the surface, with the color as text. */
export const badgeVariants = cva(
  'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-raised text-muted-foreground ring-1 ring-inset ring-border',
        primary: 'bg-primary/14 text-primary',
        success: 'bg-success/14 text-success',
        warning: 'bg-warning/14 text-warning',
        danger: 'bg-danger/14 text-danger',
        violet: 'bg-violet/14 text-violet',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
