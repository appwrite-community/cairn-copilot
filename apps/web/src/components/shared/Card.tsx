import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function Card({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-border bg-surface', className)}>
      <header className="flex h-11 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function CardLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className="flex shrink-0 items-center gap-1 rounded text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <>
        {children}
        <ArrowRight className="size-3" />
      </>
    </Link>
  );
}

export function Empty({
  icon,
  title,
  body,
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      <span className="grid size-9 place-items-center rounded-full bg-raised ring-1 ring-inset ring-border">
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="max-w-[300px] text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4 p-4" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
