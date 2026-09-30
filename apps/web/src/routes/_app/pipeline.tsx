import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DealSheet } from '@/components/deals/DealSheet';
import { StageIcon } from '@/components/deals/StageIcon';
import { Flash } from '@/components/Flash';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarDate } from '@/components/shared/DateText';
import { Segmented } from '@/components/shared/Segmented';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip } from '@/components/ui/tooltip';
import { daysFromToday } from '@/lib/dates';
import {
  formatCompactCurrency,
  formatCurrency,
  OPEN_STAGES,
  plural,
  STAGE_LABELS,
} from '@/lib/format';
import { useHighlightOnArrival } from '@/lib/highlight';
import { dealsQuery } from '@/lib/queries';
import { inTeam, useSession } from '@/lib/session';
import type { Deal, Stage } from '@/lib/types';
import { cn } from '@/lib/utils';

type Search = { highlight?: string };

export const Route = createFileRoute('/_app/pipeline')({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search.highlight === 'string' ? { highlight: search.highlight } : {},
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(dealsQuery).catch(() => undefined),
  component: Pipeline,
  // Slow loads show the page with its skeletons; fast ones keep the previous page.
  pendingComponent: Pipeline,
});

const BOARD: Stage[] = ['discovery', 'proposal', 'negotiation', 'closed_won'];

function Pipeline() {
  const session = useSession();
  const deals = useQuery(dealsQuery);
  const [showLost, setShowLost] = useState(false);
  const [owner, setOwner] = useState<'everyone' | 'mine'>('everyone');
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const { highlight } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const clearHighlight = useCallback(
    () => void navigate({ search: {}, replace: true, resetScroll: false }),
    [navigate],
  );
  useHighlightOnArrival(highlight, Boolean(deals.data), clearHighlight);

  // Deals are shared with the Sales team. Appwrite returns no rows to anyone
  // else, so the page explains why instead of showing an empty board.
  if (!inTeam(session, 'sales') && !inTeam(session, 'leadership')) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <SalesOnly
          teams={session.memberships
            .filter(({ team }) => team.$id !== 'workspace')
            .map(({ team }) => team.name)}
        />
      </>
    );
  }

  const stages = showLost ? [...BOARD, 'closed_lost' as const] : BOARD;
  const visible = deals.data?.filter(
    (deal) => owner === 'everyone' || deal.ownerId === session.user.$id,
  );
  const open = visible?.filter((deal) => OPEN_STAGES.includes(deal.stage)) ?? [];
  const openTotal = open.reduce((sum, deal) => sum + deal.amount, 0);
  const openDeal = deals.data?.find((deal) => deal.$id === openDealId) ?? null;

  return (
    <>
      <PageHeader
        title={
          <>
            Pipeline
            {visible && (
              <span className="hidden font-normal text-subtle tabular @min-[560px]:inline">
                {plural(open.length, 'open deal')} · {formatCompactCurrency(openTotal)}
              </span>
            )}
          </>
        }
        actions={
          <>
            <Segmented
              label="Owner"
              value={owner}
              onChange={setOwner}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'mine', label: 'My deals' },
              ]}
            />
            <label className="ml-2 hidden cursor-pointer items-center gap-2 text-xs text-muted-foreground @min-[720px]:flex">
              <Switch checked={showLost} onCheckedChange={setShowLost} />
              Closed lost
            </label>
          </>
        }
      />
      <div className="flex min-h-[calc(100%-3.25rem)] gap-3 overflow-x-auto px-6 pb-6 pt-5 @min-[1100px]:px-8">
        {stages.map((stage) =>
          visible ? (
            <Column
              key={stage}
              stage={stage}
              deals={visible.filter((deal) => deal.stage === stage)}
              onOpen={(deal) => setOpenDealId(deal.$id)}
            />
          ) : (
            <ColumnSkeleton key={stage} />
          ),
        )}
      </div>
      <DealSheet deal={openDeal} onClose={() => setOpenDealId(null)} />
    </>
  );
}

function Column({
  stage,
  deals,
  onOpen,
}: {
  stage: Stage;
  deals: Deal[];
  onOpen: (deal: Deal) => void;
}) {
  const total = deals.reduce((sum, deal) => sum + deal.amount, 0);
  return (
    <section
      aria-label={STAGE_LABELS[stage]}
      className="flex min-w-[248px] flex-1 basis-0 flex-col rounded-xl border border-border bg-surface/40"
    >
      <header className="flex h-11 items-center gap-2 px-3">
        <StageIcon stage={stage} />
        <h2 className="text-sm font-medium">{STAGE_LABELS[stage]}</h2>
        <span className="text-xs text-subtle tabular">{deals.length}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular">
          {formatCompactCurrency(total)}
        </span>
      </header>
      <div className="flex flex-col gap-2 px-2 pb-2">
        {deals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-subtle">
            No deals
          </p>
        ) : (
          deals.map((deal) => <DealTile key={deal.$id} deal={deal} onOpen={() => onOpen(deal)} />)
        )}
      </div>
    </section>
  );
}

function DealTile({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const days = daysFromToday(deal.closeDate);
  const open = deal.stage !== 'closed_won' && deal.stage !== 'closed_lost';
  return (
    <button
      type="button"
      onClick={onOpen}
      data-row-id={deal.$id}
      className="group relative w-full rounded-lg border border-border bg-surface p-3 text-left outline-none transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Flash rowId={deal.$id} />
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">{deal.name}</p>
        {deal.updatedVia === 'scout' && (
          <Tooltip content={`Updated by ${deal.updatedByName ?? 'Scout'} via Scout`}>
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/15"
              aria-label="Updated via Scout"
            />
          </Tooltip>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.accountName}</p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="font-medium tabular">{formatCurrency(deal.amount)}</span>
        <span className="text-border-strong">·</span>
        <CalendarDate
          iso={deal.closeDate}
          className={cn(
            open && days < 0
              ? 'text-danger'
              : open && days <= 14
                ? 'text-warning'
                : 'text-muted-foreground',
          )}
        />
        <Tooltip content={deal.ownerName}>
          <span className="ml-auto">
            <Avatar name={deal.ownerName} size="xs" />
          </span>
        </Tooltip>
      </div>
    </button>
  );
}

function ColumnSkeleton() {
  return (
    <div
      className="flex min-w-[248px] flex-1 basis-0 flex-col gap-2 rounded-xl border border-border bg-surface/40 p-2"
      aria-hidden
    >
      <Skeleton className="m-1 h-5 w-32" />
      <Skeleton className="h-[92px] rounded-lg" />
      <Skeleton className="h-[92px] rounded-lg" />
      <Skeleton className="h-[92px] rounded-lg opacity-60" />
    </div>
  );
}

function SalesOnly({ teams }: { teams: string[] }) {
  return (
    <div className="grid place-items-center px-6 py-20">
      <div className="flex max-w-[400px] flex-col items-center text-center">
        <div aria-hidden className="relative mb-6 h-[104px] w-[220px]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-0 flex h-[104px] w-[64px] flex-col gap-1.5 rounded-lg border border-border bg-surface/60 p-1.5"
              style={{ left: i * 78 }}
            >
              <div className="h-2 w-8 rounded-full bg-raised" />
              <div className="h-7 rounded bg-raised/80" />
              <div className="h-7 rounded bg-raised/50" />
            </div>
          ))}
          <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border-strong bg-popover shadow-overlay">
            <Lock className="size-4 text-muted-foreground" />
          </span>
        </div>
        <h1 className="text-lg font-semibold tracking-[-0.01em]">
          The pipeline is shared with the Sales team
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {teams.length
            ? `Your account is in ${teams.join(' and ')}.`
            : "Your account isn't in the Sales team."}
        </p>
      </div>
    </div>
  );
}
