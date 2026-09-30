import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronRight, CircleCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { Empty } from '@/components/shared/Card';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Skeleton } from '@/components/ui/skeleton';
import { daysFromToday } from '@/lib/dates';
import { useHighlightOnArrival } from '@/lib/highlight';
import { tasksQuery } from '@/lib/queries';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

type Search = { highlight?: string };

export const Route = createFileRoute('/_app/tasks')({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search.highlight === 'string' ? { highlight: search.highlight } : {},
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(tasksQuery).catch(() => undefined),
  component: Tasks,
  // Slow loads show the page with its skeletons; fast ones keep the previous page.
  pendingComponent: Tasks,
});

const GROUPS = [
  { id: 'overdue', title: 'Overdue', match: (days: number) => days < 0 },
  { id: 'today', title: 'Today', match: (days: number) => days === 0 },
  { id: 'week', title: 'This week', match: (days: number) => days > 0 && days < 7 },
  { id: 'later', title: 'Later', match: (days: number) => days >= 7 },
] as const;

function Tasks() {
  const { data: tasks } = useQuery(tasksQuery);
  const { highlight } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [showDone, setShowDone] = useState(false);

  // A completed task opened from Scout's Sources: show the Completed group first.
  const highlightsDone = Boolean(
    highlight && tasks?.some((task) => task.done && highlight.split(',').includes(task.$id)),
  );
  useEffect(() => {
    if (highlightsDone) setShowDone(true);
  }, [highlightsDone]);
  const clearHighlight = useCallback(
    () => void navigate({ search: {}, replace: true, resetScroll: false }),
    [navigate],
  );
  useHighlightOnArrival(highlight, Boolean(tasks) && (!highlightsDone || showDone), clearHighlight);

  const open = tasks?.filter((task) => !task.done) ?? [];
  const done = tasks?.filter((task) => task.done) ?? [];

  return (
    <>
      <PageHeader
        title="Tasks"
        actions={tasks && <span className="text-xs text-subtle tabular">{open.length} open</span>}
      />
      <PageBody className="max-w-[880px]">
        {!tasks ? (
          <TasksSkeleton />
        ) : (
          <div className="flex flex-col gap-6">
            {open.length === 0 && (
              <Empty
                icon={<CircleCheck className="size-4 text-success" />}
                title="You're all caught up."
                body="New follow-ups from you or Scout show up here."
                className="rounded-xl border border-border bg-surface py-14"
              />
            )}
            {GROUPS.map((group) => {
              const items = open.filter((task) => group.match(daysFromToday(task.dueDate)));
              if (items.length === 0) return null;
              return <Group key={group.id} title={group.title} tasks={items} tone={group.id} />;
            })}
            {done.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowDone(!showDone)}
                  aria-expanded={showDone}
                  className="flex h-7 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <ChevronRight
                    className={cn(
                      'size-3.5 transition-transform duration-150',
                      showDone && 'rotate-90',
                    )}
                  />
                  Completed
                  <span className="text-xs font-normal text-subtle tabular">{done.length}</span>
                </button>
                {showDone && (
                  <div className="mt-2 flex flex-col rounded-xl border border-border bg-surface p-1.5">
                    {done.map((task) => (
                      <TaskRow key={task.$id} task={task} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}

function Group({ title, tasks, tone }: { title: string; tasks: Task[]; tone: string }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            tone === 'overdue'
              ? 'text-danger'
              : tone === 'today'
                ? 'text-warning'
                : 'text-foreground',
          )}
        >
          {title}
        </span>
        <span className="text-xs font-normal text-subtle tabular">{tasks.length}</span>
      </h2>
      <div className="mt-2 flex flex-col rounded-xl border border-border bg-surface p-1.5">
        {tasks.map((task) => (
          <TaskRow key={task.$id} task={task} />
        ))}
      </div>
    </section>
  );
}

function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {[3, 2].map((rows, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24" />
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className="flex gap-3">
                <Skeleton className="size-4 rounded" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
