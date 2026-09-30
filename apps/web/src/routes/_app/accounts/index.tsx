import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CircleAlert, RotateCcw, Search, SearchX, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Empty } from '@/components/shared/Card';
import { AccountTile, ConfidentialBadge, HealthBadge } from '@/components/shared/Badges';
import { CalendarDate, RelativeTime } from '@/components/shared/DateText';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, HEALTH_LABELS, SEGMENT_LABELS } from '@/lib/format';
import { isConfidential } from '@/lib/permissions';
import { accountsQuery, recentNotesQuery } from '@/lib/queries';
import type { Health } from '@/lib/types';
import { cn } from '@/lib/utils';

type Search = { q?: string; health?: Health };

const HEALTH_FILTERS: (Health | null)[] = [null, 'healthy', 'watch', 'at_risk'];

export const Route = createFileRoute('/_app/accounts/')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    health: HEALTH_FILTERS.includes(search.health as Health)
      ? (search.health as Health)
      : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(
        accountsQuery({ search: deps.q?.trim() ?? '', health: deps.health ?? null }),
      ),
      queryClient.ensureQueryData(recentNotesQuery),
    ]).catch(() => undefined),
  component: Accounts,
});

function Accounts() {
  const { q = '', health = null } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [input, setInput] = useState(q);

  // Search as the user types, a moment after they stop.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim() !== q) {
        void navigate({
          search: (prev) => ({ ...prev, q: input.trim() || undefined }),
          replace: true,
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [input, q, navigate]);

  const accounts = useQuery(accountsQuery({ search: q.trim(), health }));
  const notes = useQuery(recentNotesQuery);

  // "Last note" comes from the notes this user can read, so it differs by person.
  const lastNoteAt = useMemo(() => {
    const latest = new Map<string, string>();
    for (const note of notes.data ?? []) {
      if (!latest.has(note.accountId)) latest.set(note.accountId, note.$createdAt);
    }
    return latest;
  }, [notes.data]);

  return (
    <>
      <PageHeader title="Accounts" />
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-8 pt-6 @min-[1100px]:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Search accounts"
              aria-label="Search accounts"
              className="pl-8 pr-8"
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-subtle outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Health"
            className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5"
          >
            {HEALTH_FILTERS.map((value) => {
              const active = value === health;
              return (
                <button
                  key={value ?? 'all'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() =>
                    navigate({ search: (prev) => ({ ...prev, health: value ?? undefined }) })
                  }
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60',
                    active
                      ? 'bg-raised text-foreground shadow-[inset_0_0_0_1px_#33333c]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {value && <HealthDot health={value} />}
                  {value ? HEALTH_LABELS[value] : 'All'}
                </button>
              );
            })}
          </div>
          {accounts.data && (
            <p className="ml-auto text-xs text-subtle tabular">
              {accounts.data.total} {accounts.data.total === 1 ? 'account' : 'accounts'}
            </p>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-subtle">
                  <th className="h-10 px-4 font-medium">Account</th>
                  <th className="h-10 px-3 font-medium">Owner</th>
                  <th className="h-10 px-3 font-medium">Segment</th>
                  <th className="h-10 px-3 font-medium">Health</th>
                  <th className="h-10 px-3 text-right font-medium">ARR</th>
                  <th className="h-10 px-3 font-medium">Renewal</th>
                  <th className="h-10 px-4 text-right font-medium">Last note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.isPending ? (
                  <SkeletonRows />
                ) : (
                  accounts.data?.rows.map((account) => (
                    <tr
                      key={account.$id}
                      onClick={() =>
                        navigate({ to: '/accounts/$accountId', params: { accountId: account.$id } })
                      }
                      className="group cursor-pointer transition-colors duration-150 hover:bg-raised/50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <AccountTile name={account.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/accounts/$accountId"
                                params={{ accountId: account.$id }}
                                onClick={(event) => event.stopPropagation()}
                                className="truncate font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:underline"
                              >
                                {account.name}
                              </Link>
                              {isConfidential(account) && <ConfidentialBadge />}
                            </div>
                            <div className="truncate text-xs text-subtle">{account.domain}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                          <Avatar name={account.ownerName} size="xs" />
                          {account.ownerName}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {SEGMENT_LABELS[account.segment]}
                      </td>
                      <td className="px-3 py-2.5">
                        <HealthBadge health={account.health} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular">
                        {account.lifecycle === 'prospect' ? (
                          <span className="text-subtle">Prospect</span>
                        ) : (
                          formatCurrency(account.arr)
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground tabular">
                        {account.renewalDate ? (
                          <CalendarDate iso={account.renewalDate} />
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {lastNoteAt.get(account.$id) ? (
                          <RelativeTime iso={lastNoteAt.get(account.$id)!} />
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {accounts.isError && !accounts.data && (
            <div className="p-4">
              <Alert tone="danger">
                <CircleAlert />
                <span className="flex-1">Couldn't load accounts.</span>
                <Button variant="secondary" size="sm" onClick={() => accounts.refetch()}>
                  <RotateCcw />
                  Retry
                </Button>
              </Alert>
            </div>
          )}

          {accounts.data?.rows.length === 0 && (
            <Empty
              icon={<SearchX className="size-4 text-subtle" />}
              title={q ? `No accounts match "${q}"` : 'No accounts here'}
              body={
                q ? 'Try a shorter name, or clear the search.' : 'Try a different health filter.'
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

function HealthDot({ health }: { health: Health }) {
  const color = { healthy: 'bg-success', watch: 'bg-warning', at_risk: 'bg-danger' }[health];
  return <span className={cn('size-1.5 rounded-full', color)} />;
}

function SkeletonRows() {
  return Array.from({ length: 8 }, (_, i) => (
    <tr key={i} aria-hidden>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="px-3">
        <Skeleton className="h-3.5 w-24" />
      </td>
      <td className="px-3">
        <Skeleton className="h-3.5 w-16" />
      </td>
      <td className="px-3">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-3">
        <Skeleton className="ml-auto h-3.5 w-16" />
      </td>
      <td className="px-3">
        <Skeleton className="h-3.5 w-14" />
      </td>
      <td className="px-4">
        <Skeleton className="ml-auto h-3.5 w-12" />
      </td>
    </tr>
  ));
}
