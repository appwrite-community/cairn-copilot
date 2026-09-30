import type { Health, NoteKind, Segment, Stage } from './types';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCurrency = (amount: number) => currency.format(amount);
export const formatCompactCurrency = (amount: number) => compactCurrency.format(amount);

export function initials(name: string) {
  const parts = name.replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** "Alder Freight" → "AF", "Harbor & Pine Outfitters" → "HP". */
export function companyInitials(name: string) {
  return name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export const plural = (count: number, noun: string, pluralNoun = `${noun}s`) =>
  `${count} ${count === 1 ? noun : pluralNoun}`;

export const firstName = (name: string) => name.split(' ')[0];

export const HEALTH_LABELS: Record<Health, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  enterprise: 'Enterprise',
  mid_market: 'Mid-market',
  smb: 'SMB',
};

export const STAGES: Stage[] = [
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export const STAGE_LABELS: Record<Stage, string> = {
  discovery: 'Discovery',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed won',
  closed_lost: 'Closed lost',
};

export const OPEN_STAGES: Stage[] = ['discovery', 'proposal', 'negotiation'];

export const KIND_LABELS: Record<NoteKind, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  internal: 'Internal',
};
