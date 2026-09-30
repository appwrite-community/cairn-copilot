import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AppwriteException } from 'appwrite';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Lock,
  PenLine,
  Users,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { DealCard } from '@/components/deals/DealCard';
import { DealSheet } from '@/components/deals/DealSheet';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { NoteComposer } from '@/components/notes/NoteComposer';
import { NoteItem } from '@/components/notes/NoteItem';
import { useScout } from '@/components/scout/ScoutProvider';
import { AccountTile, ConfidentialBadge, HealthBadge } from '@/components/shared/Badges';
import { Card, Empty } from '@/components/shared/Card';
import { CalendarDate } from '@/components/shared/DateText';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { formatCurrency, plural, SEGMENT_LABELS } from '@/lib/format';
import { useHighlightOnArrival } from '@/lib/highlight';
import { isConfidential } from '@/lib/permissions';
import {
  accountNotesQuery,
  accountQuery,
  contactsQuery,
  dealsQuery,
  tasksQuery,
} from '@/lib/queries';
import { inTeam, useSession } from '@/lib/session';
import type { Account, Contact, Deal } from '@/lib/types';

type Search = { highlight?: string };

export const Route = createFileRoute('/_app/accounts/$accountId')({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search.highlight === 'string' ? { highlight: search.highlight } : {},
  loader: ({ context: { queryClient }, params: { accountId } }) =>
    Promise.allSettled([
      queryClient.ensureQueryData(accountQuery(accountId)),
      queryClient.ensureQueryData(contactsQuery(accountId)),
      queryClient.ensureQueryData(accountNotesQuery(accountId)),
      queryClient.ensureQueryData(dealsQuery),
      queryClient.ensureQueryData(tasksQuery),
    ]),
  component: AccountPage,
});

function AccountPage() {
  const { accountId } = Route.useParams();
  const account = useQuery(accountQuery(accountId));

  if (account.isPending) return <AccountSkeleton />;
  if (!account.data) {
    const missing = account.error instanceof AppwriteException && account.error.code === 404;
    return <NotShared failed={!missing} onRetry={() => account.refetch()} />;
  }
  return <AccountView account={account.data} />;
}

function AccountView({ account }: { account: Account }) {
  const session = useSession();
  const scout = useScout();
  const { highlight } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);

  const notes = useQuery(accountNotesQuery(account.$id));
  const contacts = useQuery(contactsQuery(account.$id));
  const deals = useQuery(dealsQuery);
  const tasks = useQuery(tasksQuery);

  const accountDeals = deals.data?.filter((deal) => deal.accountId === account.$id);
  const accountTasks = tasks.data?.filter((task) => task.accountId === account.$id && !task.done);
  const canSeeDeals = inTeam(session, 'sales') || inTeam(session, 'leadership');

  // Records opened from Scout's Sources: flash them once the rows are on screen.
  const ready = Boolean(notes.data && contacts.data && deals.data && tasks.data);
  const clearHighlight = useCallback(
    () => void navigate({ search: {}, replace: true, resetScroll: false }),
    [navigate],
  );
  useHighlightOnArrival(highlight, ready, clearHighlight);

  function focusComposer() {
    composerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    composerRef.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <PageHeader
        title={
          <>
            <Link
              to="/accounts"
              className="text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:underline"
            >
              Accounts
            </Link>
            <ChevronRight className="size-3.5 text-subtle" />
            <span className="truncate">{account.name}</span>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => scout.prefill(`Prep me for my call with ${account.name}`)}
            >
              <ScoutMark size={16} className="bg-transparent ring-0" />
              <span className="hidden @min-[640px]:inline">Ask Scout about {account.name}</span>
              <span className="@min-[640px]:hidden">Ask Scout</span>
            </Button>
            <Button onClick={focusComposer}>
              <PenLine />
              Add note
            </Button>
          </>
        }
      />
      <PageBody>
        <AccountHeader account={account} />

        <div className="mt-6 grid gap-5 @min-[760px]:grid-cols-[minmax(0,1fr)_280px] @min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
          <aside className="grid content-start gap-4 @min-[560px]:grid-cols-2 @min-[760px]:order-2 @min-[760px]:grid-cols-1">
            <Card title={accountDeals && accountDeals.length > 1 ? 'Deals' : 'Deal'}>
              <div className="p-3">
                {!canSeeDeals ? (
                  <div className="flex items-start gap-2.5 rounded-lg bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-subtle" />
                    Deals are visible to the Sales team.
                  </div>
                ) : !accountDeals ? (
                  <Skeleton className="h-[108px] rounded-lg" />
                ) : accountDeals.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-subtle">No deals on this account.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {accountDeals.map((deal) => (
                      <DealCard key={deal.$id} deal={deal} onOpen={() => setOpenDeal(deal)} />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card
              title="Contacts"
              action={
                contacts.data && (
                  <span className="text-xs text-subtle tabular">{contacts.data.length}</span>
                )
              }
            >
              {!contacts.data ? (
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : contacts.data.length === 0 ? (
                <Empty
                  icon={<Users className="size-4 text-subtle" />}
                  title="No contacts yet"
                  className="py-6"
                />
              ) : (
                <ul className="flex flex-col p-1.5">
                  {contacts.data.map((contact) => (
                    <ContactRow key={contact.$id} contact={contact} />
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Your tasks here"
              className="@min-[560px]:col-span-2 @min-[760px]:col-span-1"
            >
              {!accountTasks ? (
                <div className="p-4">
                  <Skeleton className="h-9" />
                </div>
              ) : accountTasks.length === 0 ? (
                <p className="px-4 py-4 text-sm text-subtle">No open tasks for this account.</p>
              ) : (
                <div className="flex flex-col p-1.5">
                  {accountTasks.map((task) => (
                    <TaskRow key={task.$id} task={task} showAccount={false} />
                  ))}
                </div>
              )}
            </Card>
          </aside>

          <section aria-labelledby="timeline-heading" className="min-w-0 @min-[760px]:order-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="timeline-heading" className="text-sm font-semibold">
                Timeline
              </h2>
              {notes.data && (
                <span className="text-xs text-subtle tabular">
                  {plural(notes.data.total, 'note')} you can read
                </span>
              )}
            </div>
            <NoteComposer account={account} ref={composerRef} />
            <div className="mt-3 flex flex-col gap-2.5">
              {!notes.data ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)
              ) : notes.data.rows.length === 0 ? (
                <Empty
                  icon={<FileText className="size-4 text-subtle" />}
                  title="No notes yet"
                  body={`Notes you can read about ${account.name} appear here.`}
                  className="rounded-xl border border-dashed border-border"
                />
              ) : (
                notes.data.rows.map((note) => <NoteItem key={note.$id} note={note} />)
              )}
            </div>
          </section>
        </div>
      </PageBody>
      <DealSheet deal={openDeal} onClose={() => setOpenDeal(null)} />
    </>
  );
}

function AccountHeader({ account }: { account: Account }) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <AccountTile name={account.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-[-0.015em]">{account.name}</h1>
            <HealthBadge health={account.health} />
            {isConfidential(account) && <ConfidentialBadge />}
          </div>
          <a
            href={`https://${account.domain}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:underline"
          >
            {account.domain}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <p className="mt-3 max-w-[70ch] text-sm text-muted-foreground">{account.summary}</p>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-3 text-sm">
        <Meta label="Owner">
          <span className="flex items-center gap-1.5">
            <Avatar name={account.ownerName} size="xs" />
            {account.ownerName}
          </span>
        </Meta>
        <Meta label="ARR">
          {account.lifecycle === 'prospect' ? (
            <span className="text-muted-foreground">Prospect</span>
          ) : (
            <span className="tabular">{formatCurrency(account.arr)}</span>
          )}
        </Meta>
        <Meta label="Renewal">
          {account.renewalDate ? (
            <CalendarDate iso={account.renewalDate} />
          ) : (
            <span className="text-subtle">-</span>
          )}
        </Meta>
        <Meta label="Segment">{SEGMENT_LABELS[account.segment]}</Meta>
        <Meta label="Industry">{account.industry}</Meta>
      </dl>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      toast.success('Email copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the email.");
    }
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-raised/50">
      <Avatar name={contact.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{contact.name}</span>
          {contact.isPrimary && <Badge className="h-4 px-1 text-[10px]">Primary</Badge>}
        </div>
        <div className="truncate text-xs text-subtle">{contact.title}</div>
      </div>
      <Tooltip content={copied ? 'Copied' : contact.email}>
        <button
          type="button"
          onClick={copyEmail}
          aria-label={`Copy ${contact.name}'s email`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-subtle opacity-0 outline-none transition-[opacity,color,background-color] hover:bg-raised hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 group-hover:opacity-100"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      </Tooltip>
    </li>
  );
}

function NotShared({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <>
      <PageHeader
        title={
          <Link to="/accounts" className="text-muted-foreground hover:text-foreground">
            Accounts
          </Link>
        }
      />
      <div className="grid place-items-center px-6 py-24">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="grid size-10 place-items-center rounded-full bg-raised ring-1 ring-inset ring-border">
            {failed ? (
              <CircleAlert className="size-4 text-subtle" />
            ) : (
              <Lock className="size-4 text-subtle" />
            )}
          </span>
          <h1 className="mt-4 text-lg font-semibold">
            {failed
              ? "Couldn't load this account"
              : "This account doesn't exist or isn't shared with you."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {failed
              ? 'Check your connection, then try again.'
              : 'Accounts only appear for the teams they are shared with.'}
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/accounts">
                <ArrowLeft />
                Back to accounts
              </Link>
            </Button>
            {failed && <Button onClick={onRetry}>Try again</Button>}
          </div>
        </div>
      </div>
    </>
  );
}

function AccountSkeleton() {
  return (
    <>
      <PageHeader title={<Skeleton className="h-4 w-40" />} />
      <PageBody>
        <div className="flex items-start gap-4" aria-hidden>
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="mt-4 h-4 w-2/3" />
        <Skeleton className="mt-4 h-14 w-full" />
        <div className="mt-6 grid gap-5 @min-[760px]:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </PageBody>
    </>
  );
}
