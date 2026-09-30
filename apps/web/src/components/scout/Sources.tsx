import { Link } from '@tanstack/react-router';
import {
  Building2,
  FileText,
  Handshake,
  ListChecks,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { plural } from '@/lib/format';
import type { RecordRef } from '@/lib/types';

type Source = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Where the chip leads; the rows in `highlight` flash when the page opens. */
  to: 'account' | 'pipeline' | 'tasks';
  accountId: string | null;
  highlight: string[];
};

// Up to this many deals get a chip each; more become one "N deals" chip on the pipeline.
const MAX_DEAL_CHIPS = 3;

type Group = Source & { count: number; noun: string; title: string };

const ORDER: RecordRef['table'][] = ['accounts', 'deals', 'notes', 'contacts', 'tasks'];
const ICONS = { notes: FileText, contacts: UserRound, tasks: ListChecks };
const NOUNS = { notes: 'note', contacts: 'contact', tasks: 'task' };

/**
 * Groups the rows Scout read or wrote into chips: one per account and deal, one per account
 * for its notes and its contacts, and one for tasks. Every row here is one the user can open,
 * because Scout only reached it with the user's permissions.
 */
export function groupSources(records: RecordRef[]): Source[] {
  const sorted = [...records].sort((a, b) => ORDER.indexOf(a.table) - ORDER.indexOf(b.table));
  const accountNames = new Map(
    records.filter((r) => r.table === 'accounts').map((r) => [r.id, r.label]),
  );
  const chips: (Source | Group)[] = [];
  const groups = new Map<string, Group>();

  for (const record of sorted) {
    if (record.table === 'accounts') {
      chips.push({
        key: record.id,
        label: record.label,
        icon: Building2,
        to: 'account',
        accountId: record.id,
        highlight: [],
      });
    } else if (record.table === 'deals') {
      chips.push({
        key: record.id,
        label: `Deal · ${record.label}`,
        icon: Handshake,
        to: 'account',
        accountId: record.accountId,
        highlight: [record.id],
      });
    } else {
      // Tasks open the Tasks page, so they form one group across accounts.
      const accountId = record.table === 'tasks' ? null : record.accountId;
      const key = `${record.table}:${accountId}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          label: '',
          icon: ICONS[record.table],
          to: accountId ? 'account' : 'tasks',
          accountId,
          highlight: [],
          count: 0,
          noun: NOUNS[record.table],
          title: record.label,
        };
        groups.set(key, group);
        chips.push(group);
      }
      group.count += 1;
      group.highlight.push(record.id);
    }
  }

  const accountsWithGroups = new Set(
    [...groups.values()].filter((g) => g.accountId).map((g) => g.accountId),
  );
  const deals = chips.filter((chip) => chip.icon === Handshake);
  if (deals.length > MAX_DEAL_CHIPS) {
    const first = chips.indexOf(deals[0]);
    const rest = chips.filter((chip) => chip.icon !== Handshake);
    rest.splice(first, 0, {
      key: 'deals',
      label: plural(deals.length, 'deal'),
      icon: Handshake,
      to: 'pipeline',
      accountId: null,
      highlight: deals.map((deal) => deal.key),
    });
    chips.splice(0, chips.length, ...rest);
  }

  return chips.map((chip) => {
    if (!('count' in chip)) return chip;
    const { count, noun, title, ...source } = chip;
    if (noun === 'task') {
      return { ...source, label: count === 1 ? `Task · ${title}` : plural(count, noun) };
    }
    const name = source.accountId ? accountNames.get(source.accountId) : undefined;
    const label = plural(count, noun);
    return { ...source, label: accountsWithGroups.size > 1 && name ? `${label} · ${name}` : label };
  });
}

export function Sources({ records }: { records: RecordRef[] }) {
  const sources = groupSources(records);
  if (sources.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-subtle">Sources</p>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const Icon = source.icon;
          const chip =
            'inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs text-muted-foreground outline-none transition-colors duration-150 hover:border-border-strong hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60';
          const content = (
            <>
              <Icon className="size-3 shrink-0 text-subtle" />
              <span className="truncate">{source.label}</span>
            </>
          );
          return (
            <li key={source.key} className="max-w-full">
              {source.to === 'account' && source.accountId ? (
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: source.accountId }}
                  search={source.highlight.length ? { highlight: source.highlight.join(',') } : {}}
                  className={chip}
                >
                  {content}
                </Link>
              ) : (
                <Link
                  to={source.to === 'pipeline' ? '/pipeline' : '/tasks'}
                  search={{ highlight: source.highlight.join(',') }}
                  className={chip}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
