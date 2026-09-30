import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { Sidebar } from '@/components/layout/Sidebar';
import { ScoutPanel } from '@/components/scout/ScoutPanel';
import { ScoutProvider, useScout } from '@/components/scout/ScoutProvider';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { realtime } from '@/lib/appwrite';
import { flash } from '@/lib/highlight';
import { useModShortcut } from '@/lib/keyboard';
import { subscribeToRecords, useSubscription } from '@/lib/realtime';
import {
  isSignedOutError,
  sessionHint,
  sessionQuery,
  useSession,
  workspaceName,
} from '@/lib/session';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const toSignIn = redirect({
      to: '/sign-in',
      search: location.href === '/' ? {} : { redirect: location.href },
    });
    if (!sessionHint.exists()) throw toSignIn;
    try {
      await context.queryClient.ensureQueryData(sessionQuery);
    } catch (err) {
      if (!isSignedOutError(err)) throw err;
      sessionHint.clear();
      throw toSignIn;
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <ScoutProvider>
      <SignedOutElsewhere />
      <LiveRecords />
      <Shell />
    </ScoutProvider>
  );
}

/**
 * Keeps every page current: when someone else, or Scout, changes a record
 * this user can read, Appwrite sends the change through Realtime.
 */
function LiveRecords() {
  const queryClient = useQueryClient();
  useSubscription(
    () =>
      subscribeToRecords(({ tableId, action, row }) => {
        void queryClient.invalidateQueries({ queryKey: [tableId] });
        if (action !== 'delete') flash(row.$id);
      }),
    [queryClient],
  );
  return null;
}

/** Signing out in another tab ends this session too, so this tab goes to the sign-in page. */
function SignedOutElsewhere() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== sessionHint.key || event.newValue !== null) return;
      void realtime.disconnect();
      // Leave the signed-in layout first, so nothing refetches with the ended session.
      void navigate({
        to: '/sign-in',
        search: { redirect: window.location.pathname, ended: true },
      }).then(() => queryClient.clear());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient, navigate]);
  return null;
}

function Shell() {
  const scout = useScout();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('cairn:sidebar-collapsed') === 'true',
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((value) => {
      localStorage.setItem('cairn:sidebar-collapsed', String(!value));
      return !value;
    });
  }, []);
  const { open: scoutOpen, setOpen: setScoutOpen } = scout;
  const toggleScout = useCallback(() => setScoutOpen(!scoutOpen), [scoutOpen, setScoutOpen]);

  useModShortcut('\\', toggleSidebar);
  useModShortcut('j', toggleScout);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-16' : 'w-58',
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleSidebar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar onMenu={() => setMenuOpen(true)} />
        <main id="main" className="@container relative min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {isDesktop ? (
        scout.open && (
          <aside
            aria-label="Scout"
            className="w-[440px] shrink-0 border-l border-border bg-sidebar duration-200 ease-out animate-in fade-in-0 slide-in-from-right-6"
          >
            <ScoutPanel />
          </aside>
        )
      ) : (
        <Sheet open={scout.open} onOpenChange={scout.setOpen}>
          <SheetContent
            side="right"
            showClose={false}
            className="w-full p-0 sm:max-w-[440px]"
            // The panel focuses its composer itself.
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SheetTitle className="sr-only">Scout</SheetTitle>
            <SheetDescription className="sr-only">Ask Scout about your accounts.</SheetDescription>
            <ScoutPanel />
          </SheetContent>
        </Sheet>
      )}

      {!isDesktop && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" showClose={false} className="w-[264px] p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigate Cairn.</SheetDescription>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function MobileBar({ onMenu }: { onMenu: () => void }) {
  const session = useSession();
  const scout = useScout();
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-sidebar px-2 lg:hidden">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Menu className="size-4.5" />
      </button>
      <LogoMark className="size-5" />
      <span className="truncate text-sm font-semibold">{workspaceName(session)}</span>
      <button
        type="button"
        onClick={() => scout.setOpen(true)}
        className="ml-auto flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ScoutMark size={18} />
        Ask Scout
      </button>
    </div>
  );
}
