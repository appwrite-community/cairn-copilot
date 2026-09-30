import { useQuery } from '@tanstack/react-query';
import { Check, History, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { relativeTime } from '@/lib/dates';
import { threadsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useScout } from './ScoutProvider';

/** Earlier conversations. Threads belong to their creator, so this lists only the user's own. */
export function ThreadHistory() {
  const { threadId, selectThread } = useScout();
  const [open, setOpen] = useState(false);
  const threads = useQuery({ ...threadsQuery, enabled: open });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="History">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="History">
            <History />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-1">
        <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-subtle">Conversations</p>
        {threads.isPending ? (
          <div className="flex flex-col gap-1 p-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : !threads.data?.length ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <MessageSquare className="size-4 text-subtle" />
            <p className="text-sm text-muted-foreground">No earlier conversations</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {threads.data.map((thread) => {
              const current = thread.$id === threadId;
              return (
                <li key={thread.$id}>
                  <button
                    type="button"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => {
                      selectThread(thread.$id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-raised focus-visible:bg-raised',
                      current ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                    <span className="shrink-0 text-xs text-subtle">
                      {relativeTime(thread.lastRunAt ?? thread.$createdAt)}
                    </span>
                    <Check
                      className={cn('size-3.5 shrink-0 text-primary', !current && 'invisible')}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
