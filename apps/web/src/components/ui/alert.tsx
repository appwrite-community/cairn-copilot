import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        danger: 'border-danger/25 bg-danger/8 [&>svg]:text-danger',
        warning: 'border-warning/25 bg-warning/8 [&>svg]:text-warning',
        neutral: 'border-border bg-surface [&>svg]:text-subtle',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Alert({
  className,
  tone,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ tone }), className)} {...props} />;
}
