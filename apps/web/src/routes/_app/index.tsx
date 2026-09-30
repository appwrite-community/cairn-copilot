import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { CircleCheck, FileText, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardLink, Empty, ListSkeleton } from '@/components/shared/Card';
import { ViaScout, VisibilityBadge } from '@/components/shared/Badges';
import { RelativeTime } from '@/components/shared/DateText';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { daysFromToday, greeting } from '@/lib/dates';
import { firstName, formatCompactCurrency, OPEN_STAGES, plural } from '@/lib/format';
import { visibilityOf } from '@/lib/permissions';
import { accountsQuery, dealsQuery, recentNotesQuery, tasksQuery } from '@/lib/queries';
import { inTeam, useSession } from '@/lib/session';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';

const allAccounts = accountsQuery({ search: '', health: null });

export const Route = createFileRoute('/_app/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(dealsQuery),
      queryClient.ensureQueryData(tasksQuery),
      queryClient.ensureQueryData(recentNotesQuery),
      queryClient.ensureQueryData(allAccounts),
    ]).catch(() => undefined),
  component: Today,
  // Slow loads show the page with its skeletons; fast ones keep the previous page.
  pendingComponent: Today,
});

function Today() {
  const session = useSession();
  const { user } = session;

  return (
    <>
      <PageHeader title="Today" />
      <PageBody>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {greeting()}, {firstName(user.name)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>

        <Stats />

        <div className="mt-6 grid gap-6 @min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <YourTasks />
          <RecentNotes />
        </div>
      </PageBody>
    </>
  );
}

function Stats() {
  const session = useSession();
  const deals = useQuery(dealsQuery);
  const tasks = useQuery(tasksQuery);
  const accounts = useQuery(allAccounts);

  if (!deals.data || !tasks.data || !accounts.data) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-3 @min-[760px]:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
    );
  }

  const inSales = inTeam(session, 'sales');
  const myOpen = deals.data.filter(
    (deal) => deal.ownerId === session.user.$id && OPEN_STAGES.includes(deal.stage),
  );
  const closingSoon = myOpen.filter((deal) => daysFromToday(deal.closeDate) <= 30);
  const openTasks = tasks.data.filter((task) => !task.done && daysFromToday(task.dueDate) < 7);
  const overdue = openTasks.filter((task) => daysFromToday(task.dueDate) < 0);
  const atRisk = accounts.data.rows.filter((account) => account.health === 'at_risk');
  const sum = (list: { amount: number }[]) => list.reduce((total, deal) => total + deal.amount, 0);

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 @min-[760px]:grid-cols-4">
      <Stat label="Your open pipeline" locked={!inSales}>
        <StatValue>{formatCompactCurrency(sum(myOpen))}</StatValue>
        <StatNote>{plural(myOpen.length, 'open deal')}</StatNote>
      </Stat>
      <Stat label="Closing in 30 days" locked={!inSales}>
        <StatValue>{closingSoon.length}</StatValue>
        <StatNote>
          {closingSoon.length
            ? `${formatCompactCurrency(sum(closingSoon))} in play`
            : 'Nothing due to close'}
        </StatNote>
      </Stat>
      <Stat label="Tasks due this week">
        <StatValue>{openTasks.length}</StatValue>
        <StatNote className={overdue.length ? 'text-danger' : undefined}>
          {overdue.length ? `${overdue.length} overdue` : 'None overdue'}
        </StatNote>
      </Stat>
      <Stat label="Accounts at risk">
        <StatValue>{atRisk.length}</StatValue>
        <StatNote className="truncate">
          {atRisk.length
            ? atRisk.map((account) => account.name.split(' ')[0]).join(', ')
            : 'All accounts on track'}
        </StatNote>
      </Stat>
    </div>
  );
}

function Stat({
  label,
  locked,
  children,
}: {
  label: string;
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {locked ? (
        <div className="mt-2">
          <p className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 text-subtle" />
            Sales team only
          </p>
          <p className="mt-1 text-xs text-subtle">Shared with Sales</p>
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );
}

const StatValue = ({ children }: { children: ReactNode }) => (
  <p className="text-2xl font-semibold tracking-[-0.02em] tabular">{children}</p>
);

const StatNote = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn('mt-1 text-xs text-subtle', className)}>{children}</p>
);

function YourTasks() {
  const { data: tasks } = useQuery(tasksQuery);
  const upcoming = tasks?.filter((task) => !task.done && daysFromToday(task.dueDate) < 7);

  return (
    <Card title="Your tasks" action={<CardLink to="/tasks">All tasks</CardLink>}>
      {!upcoming ? (
        <ListSkeleton rows={4} />
      ) : upcoming.length === 0 ? (
        <Empty
          icon={<CircleCheck className="size-4 text-success" />}
          title="No tasks due this week"
        />
      ) : (
        <div className="flex flex-col p-1.5">
          {upcoming.map((task) => (
            <TaskRow key={task.$id} task={task} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentNotes() {
  const { data: notes } = useQuery(recentNotesQuery);
  const latest = notes?.slice(0, 8);

  return (
    <Card title="Recent notes" action={<CardLink to="/accounts">Accounts</CardLink>}>
      {!latest ? (
        <ListSkeleton rows={5} />
      ) : latest.length === 0 ? (
        <Empty icon={<FileText className="size-4 text-subtle" />} title="No notes yet" />
      ) : (
        <ul className="divide-y divide-border">
          {latest.map((note) => (
            <RecentNote key={note.$id} note={note} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentNote({ note }: { note: Note }) {
  return (
    <li className="relative">
      <Link
        to="/accounts/$accountId"
        params={{ accountId: note.accountId }}
        search={{ highlight: note.$id }}
        className="flex gap-3 px-4 py-3 outline-none transition-colors hover:bg-raised/50 focus-visible:bg-raised/60"
      >
        <Avatar name={note.authorName} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="truncate font-medium text-foreground">{note.accountName}</span>
            <span className="text-border-strong">·</span>
            <span className="shrink-0 text-muted-foreground">{note.authorName}</span>
            <span className="text-border-strong">·</span>
            <RelativeTime iso={note.$createdAt} className="text-subtle" />
            <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
              {note.source === 'scout' && <ViaScout />}
              <VisibilityBadge visibility={visibilityOf(note)} />
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{note.body}</p>
        </div>
      </Link>
    </li>
  );
}
