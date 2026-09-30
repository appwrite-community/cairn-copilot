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
  /** Opens the account page, or Tasks, with these rows highlighted. */
  accountId: string | null;
  highlight: string[];
};

/**
 * Groups the rows Scout read or wrote into chips: one per account and deal,
 * and one per account for its notes and contacts. Every row here is one the
 * user can open, because Scout only reached it with the user's permissions.
 */
export function groupSources(records: RecordRef[]): Source[] {
  const accountNames = new Map(
    records.filter((r) => r.table === 'accounts').map((r) => [r.id, r.label]),
  );
  const sources: Source[] = [];
  const grouped = new Map<string, Source & { count: number; noun: string }>();

  for (const record of records) {
    if (record.table === 'accounts') {
      sources.push({
        key: record.id,
        label: record.label,
        icon: Building2,
        accountId: record.id,
        highlight: [],
      });
    } else if (record.table === 'deals') {
      sources.push({
        key: record.id,
        label: `Deal · ${record.label}`,
        icon: Handshake,
        accountId: record.accountId,
        highlight: [record.id],
      });
    } else if (record.table === 'tasks') {
      sources.push({
        key: record.id,
        label: `Task · ${record.label}`,
        icon: ListChecks,
        accountId: null,
        highlight: [record.id],
      });
    } else {
      const key = `${record.table}:${record.accountId}`;
      const group = grouped.get(key) ?? {
        key,
        label: '',
        icon: record.table === 'notes' ? FileText : UserRound,
        accountId: record.accountId,
        highlight: [],
        count: 0,
        noun: record.table === 'notes' ? 'note' : 'contact',
      };
      group.count += 1;
      group.highlight.push(record.id);
      grouped.set(key, group);
    }
  }

  const accountsWithGroups = new Set([...grouped.values()].map((g) => g.accountId));
  for (const group of grouped.values()) {
    const name = group.accountId ? accountNames.get(group.accountId) : undefined;
    const count = plural(group.count, group.noun);
    const label = accountsWithGroups.size > 1 && name ? `${count} · ${name}` : count;
    sources.push({ ...group, label });
  }
  return sources;
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
              {source.accountId ? (
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
                  to="/tasks"
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
