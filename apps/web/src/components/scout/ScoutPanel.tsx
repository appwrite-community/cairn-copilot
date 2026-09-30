import { ArrowDown, Plus, ShieldCheck, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { ShortcutHint } from '@/components/layout/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { modKey } from '@/lib/keyboard';
import { useSession } from '@/lib/session';
import { Composer } from './Composer';
import { RunItem } from './RunItem';
import { useScout } from './ScoutProvider';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ThreadHistory } from './ThreadHistory';

const TEAM_CHIPS: Record<string, string> = {
  workspace: 'Workspace',
  sales: 'Sales',
  success: 'Customer Success',
  leadership: 'Leadership',
};

export function ScoutPanel() {
  const session = useSession();
  const scout = useScout();
  const { runs, loadingThread, threadId } = scout;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // pinned: the panel follows new content. The Jump to latest pill shows only
  // after the user scrolled up themselves.
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const lastScrollTop = useRef(0);

  function setPinned(value: boolean) {
    pinnedRef.current = value;
    setShowJump(!value);
  }

  // Scrolling up stops following; reaching the bottom starts again. Only an upward
  // scroll unpins, so new content or a smooth scroll down never does.
  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const scrolledUp = el.scrollTop < lastScrollTop.current;
    lastScrollTop.current = el.scrollTop;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) setPinned(true);
    else if (scrolledUp) setPinned(false);
  }

  function scrollToBottom(behavior: ScrollBehavior) {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }

  // Follow new steps and answers unless the user scrolled up to read.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom('auto');
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Opening Scout puts the cursor in the composer.
  useEffect(() => {
    scout.composerRef.current?.focus({ preventScroll: true });
  }, [scout.composerRef]);

  // A different conversation opens at its latest message.
  useLayoutEffect(() => {
    setPinned(true);
    scrollToBottom('auto');
  }, [threadId]);

  // A new question is followed to the bottom. An answer arrives all at once:
  // when it is taller than the panel, show its beginning, not its end.
  const lastRun = runs.at(-1);
  const seen = useRef({ id: lastRun?.id, status: lastRun?.status });
  useLayoutEffect(() => {
    const previous = seen.current;
    seen.current = { id: lastRun?.id, status: lastRun?.status };
    const el = scrollRef.current;
    const article = contentRef.current?.querySelector('article:last-of-type');
    if (!el || !article || !lastRun) return;

    if (lastRun.id !== previous.id) {
      if (lastRun.status === 'queued') {
        setPinned(true);
        scrollToBottom('smooth');
      }
      return;
    }

    const finished = previous.status === 'running' && lastRun.status !== 'running';
    if (!finished || !pinnedRef.current || article.clientHeight <= el.clientHeight) return;
    pinnedRef.current = false;
    el.scrollTop += article.getBoundingClientRect().top - el.getBoundingClientRect().top - 20;
    lastScrollTop.current = el.scrollTop;
  }, [lastRun?.id, lastRun?.status]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-4 pb-3 pt-3">
        <div className="flex items-center gap-2.5">
          <ScoutMark size={24} />
          <h2 className="text-base font-semibold tracking-[-0.01em]">Scout</h2>
          <div className="ml-auto flex items-center gap-0.5">
            <ThreadHistory />
            <Tooltip content="New conversation">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New conversation"
                onClick={() => scout.selectThread(null)}
                disabled={threadId === null}
              >
                <Plus />
              </Button>
            </Tooltip>
            <Tooltip content={<ShortcutHint label="Close" keys={[modKey, 'J']} />}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close Scout"
                onClick={() => scout.setOpen(false)}
              >
                <X />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 pl-[34px]">
          <Tooltip
            content="Scout uses your access. It can only read and change what you can."
            side="bottom"
            align="start"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Acting as {session.user.name}
            </span>
          </Tooltip>
          <span className="ml-1 flex min-w-0 gap-1 overflow-hidden">
            {session.memberships.map(({ team }) => (
              <Badge
                key={team.$id}
                tone={team.$id === 'leadership' ? 'violet' : 'neutral'}
                className="h-[18px] text-[11px]"
              >
                {TEAM_CHIPS[team.$id] ?? team.name}
              </Badge>
            ))}
          </span>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
          <div ref={contentRef} className="flex min-h-full flex-col">
            {loadingThread ? (
              <ThreadSkeleton />
            ) : runs.length === 0 ? (
              <SuggestedPrompts />
            ) : (
              <div className="flex flex-col gap-7 px-4 py-5">
                {runs.map((run) => (
                  <RunItem key={run.id} run={run} onRetry={scout.ask} />
                ))}
              </div>
            )}
          </div>
        </div>
        {showJump && runs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPinned(true);
              scrollToBottom('smooth');
            }}
            className="absolute bottom-3 left-1/2 flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-strong bg-popover px-3 text-xs font-medium text-muted-foreground shadow-overlay outline-none transition-colors animate-in fade-in-0 slide-in-from-bottom-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowDown className="size-3.5" />
            Jump to latest
          </button>
        )}
      </div>

      <Composer onEscape={() => scout.setOpen(false)} />
      <span className="sr-only" aria-live="polite">
        {runs.at(-1)?.status === 'completed' ? 'Scout answered.' : ''}
      </span>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-5" aria-hidden>
      <Skeleton className="ml-auto h-9 w-2/3 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="size-6 rounded-md" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-[90%]" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      </div>
    </div>
  );
}
