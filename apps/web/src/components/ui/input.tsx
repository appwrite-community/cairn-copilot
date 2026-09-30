import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const fieldStyles =
  'w-full min-w-0 rounded-md border border-border bg-raised px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-border-strong focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger/70';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldStyles, 'h-8', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldStyles, 'resize-none py-2', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label className={cn('text-xs font-medium text-muted-foreground', className)} {...props} />
  );
}
