import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function Root() {
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={150}>
      <Outlet />
      <Toaster />
    </TooltipProvider>
  );
}

function FullPageMessage({
  code,
  title,
  body,
  action,
}: {
  code: string;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <LogoMark className="size-9" />
        <p className="mt-6 font-mono text-xs tracking-wider text-subtle">{code}</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6">{action}</div>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <FullPageMessage
      code="404"
      title="This page doesn't exist"
      body="The link may be old, or the page moved. Your accounts and notes are where you left them."
      action={
        <Button asChild variant="secondary">
          <Link to="/">Go to Today</Link>
        </Button>
      }
    />
  );
}

function RootError() {
  const router = useRouter();
  return (
    <FullPageMessage
      code="ERROR"
      title="Cairn couldn't load"
      body="The server didn't answer. Check your connection, then try again."
      action={
        <Button variant="secondary" onClick={() => router.invalidate()}>
          <RotateCcw />
          Try again
        </Button>
      }
    />
  );
}
