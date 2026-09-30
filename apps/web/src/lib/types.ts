import type { Models } from 'appwrite';

export type TableId =
  'accounts' | 'contacts' | 'deals' | 'notes' | 'tasks' | 'threads' | 'runs' | 'steps';

export type Health = 'healthy' | 'watch' | 'at_risk';
export type Segment = 'enterprise' | 'mid_market' | 'smb';
export type Stage = 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type NoteKind = 'call' | 'meeting' | 'email' | 'internal';
export type Source = 'app' | 'scout';

export type Account = Models.Row & {
  name: string;
  domain: string;
  industry: string;
  segment: Segment;
  lifecycle: 'customer' | 'prospect';
  health: Health;
  arr: number;
  /** A calendar date stored at 12:00 UTC. */
  renewalDate: string | null;
  ownerId: string;
  ownerName: string;
  summary: string;
};

export type Contact = Models.Row & {
  accountId: string;
  accountName: string;
  name: string;
  title: string;
  email: string;
  isPrimary: boolean;
};

export type Deal = Models.Row & {
  accountId: string;
  accountName: string;
  name: string;
  amount: number;
  stage: Stage;
  /** A calendar date stored at 12:00 UTC. */
  closeDate: string;
  ownerId: string;
  ownerName: string;
  nextStep: string | null;
  updatedByName: string | null;
  updatedVia: Source | null;
};

/** Who can read a note comes from its permissions, not from a column. */
export type Note = Models.Row & {
  accountId: string;
  accountName: string;
  body: string;
  kind: NoteKind;
  authorId: string;
  authorName: string;
  source: Source;
};

export type Task = Models.Row & {
  title: string;
  /** A calendar date stored at 12:00 UTC. */
  dueDate: string;
  done: boolean;
  accountId: string | null;
  accountName: string | null;
  source: Source;
};

export type Thread = Models.Row & {
  title: string;
  lastRunAt: string | null;
};

export type Run = Models.Row & {
  threadId: string;
  prompt: string;
  status: 'running' | 'completed' | 'failed';
  answer: string | null;
  error: string | null;
  /** JSON array of RecordRef. */
  records: string | null;
  readCount: number;
  writeCount: number;
  durationMs: number | null;
};

export type Step = Models.Row & {
  runId: string;
  position: number;
  tool: string;
  label: string;
  detail: string | null;
  status: 'running' | 'done' | 'denied' | 'error';
  /** JSON array of RecordRef. */
  records: string | null;
};

/** A row that Scout read or wrote during a run, for the Sources chips. */
export type RecordRef = {
  table: 'accounts' | 'contacts' | 'deals' | 'notes' | 'tasks';
  id: string;
  label: string;
  accountId: string | null;
};

export type UserPrefs = Models.Preferences & { title?: string };
