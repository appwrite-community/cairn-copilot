import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The bar at the top of every page: title or breadcrumb on the left, actions on the right. */
export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-13 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md @min-[1100px]:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">{title}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Page content with the shared padding and width. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1240px] px-6 py-6 @min-[1100px]:px-8', className)}>
      {children}
    </div>
  );
}
