import { Permission, Role } from 'node-appwrite';

/**
 * The single source of truth for Cairn's database. provision.ts creates
 * everything listed here and never deletes anything.
 */

export const DATABASE_ID = 'crm';
export const DATABASE_NAME = 'Cairn';

export const TEAMS = [
  { teamId: 'workspace', name: 'Lumina Analytics' },
  { teamId: 'sales', name: 'Sales' },
  { teamId: 'success', name: 'Customer Success' },
  { teamId: 'leadership', name: 'Leadership' },
] as const;

export type TeamId = (typeof TEAMS)[number]['teamId'];

type ColumnBase = { key: string; required: boolean };

export type Column = ColumnBase &
  (
    | { type: 'varchar'; size: number }
    | { type: 'text' }
    | { type: 'email' }
    | { type: 'boolean' }
    | { type: 'datetime' }
    | { type: 'integer'; min?: number; max?: number }
    | { type: 'enum'; elements: string[] }
  );

export type Index = { key: string; type: 'key' | 'fulltext'; attributes: string[] };

export type TableSpec = {
  tableId: string;
  name: string;
  permissions: string[];
  columns: Column[];
  indexes: Index[];
};

// Every member of the workspace team can create rows in these tables. What
// they can read afterwards comes from each row's own permissions.
const workspaceCanCreate = [Permission.create(Role.team('workspace'))];

export const TABLES: TableSpec[] = [
  {
    tableId: 'accounts',
    name: 'Accounts',
    permissions: [],
    columns: [
      { key: 'name', type: 'varchar', size: 128, required: true },
      { key: 'domain', type: 'varchar', size: 128, required: true },
      { key: 'industry', type: 'varchar', size: 64, required: true },
      {
        key: 'segment',
        type: 'enum',
        elements: ['enterprise', 'mid_market', 'smb'],
        required: true,
      },
      { key: 'lifecycle', type: 'enum', elements: ['customer', 'prospect'], required: true },
      { key: 'health', type: 'enum', elements: ['healthy', 'watch', 'at_risk'], required: true },
      { key: 'arr', type: 'integer', min: 0, required: true },
      { key: 'renewalDate', type: 'datetime', required: false },
      { key: 'ownerId', type: 'varchar', size: 36, required: true },
      { key: 'ownerName', type: 'varchar', size: 128, required: true },
      { key: 'summary', type: 'varchar', size: 300, required: true },
    ],
    indexes: [
      { key: 'name_search', type: 'fulltext', attributes: ['name'] },
      { key: 'by_health', type: 'key', attributes: ['health'] },
      { key: 'by_owner', type: 'key', attributes: ['ownerId'] },
    ],
  },
  {
    tableId: 'contacts',
    name: 'Contacts',
    permissions: [],
    columns: [
      { key: 'accountId', type: 'varchar', size: 36, required: true },
      { key: 'accountName', type: 'varchar', size: 128, required: true },
      { key: 'name', type: 'varchar', size: 128, required: true },
      { key: 'title', type: 'varchar', size: 128, required: true },
      { key: 'email', type: 'email', required: true },
      { key: 'isPrimary', type: 'boolean', required: true },
    ],
    indexes: [
      { key: 'by_account', type: 'key', attributes: ['accountId'] },
      { key: 'name_search', type: 'fulltext', attributes: ['name'] },
    ],
  },
  {
    tableId: 'deals',
    name: 'Deals',
    permissions: [],
    columns: [
      { key: 'accountId', type: 'varchar', size: 36, required: true },
      { key: 'accountName', type: 'varchar', size: 128, required: true },
      { key: 'name', type: 'varchar', size: 160, required: true },
      { key: 'amount', type: 'integer', min: 0, required: true },
      {
        key: 'stage',
        type: 'enum',
        elements: ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        required: true,
      },
      { key: 'closeDate', type: 'datetime', required: true },
      { key: 'ownerId', type: 'varchar', size: 36, required: true },
      { key: 'ownerName', type: 'varchar', size: 128, required: true },
      { key: 'nextStep', type: 'varchar', size: 256, required: false },
      { key: 'updatedByName', type: 'varchar', size: 128, required: false },
      { key: 'updatedVia', type: 'enum', elements: ['app', 'scout'], required: false },
    ],
    indexes: [
      { key: 'by_account', type: 'key', attributes: ['accountId'] },
      { key: 'by_stage', type: 'key', attributes: ['stage'] },
      { key: 'by_owner', type: 'key', attributes: ['ownerId'] },
    ],
  },
  {
    tableId: 'notes',
    name: 'Notes',
    permissions: workspaceCanCreate,
    columns: [
      { key: 'accountId', type: 'varchar', size: 36, required: true },
      { key: 'accountName', type: 'varchar', size: 128, required: true },
      { key: 'body', type: 'text', required: true },
      {
        key: 'kind',
        type: 'enum',
        elements: ['call', 'meeting', 'email', 'internal'],
        required: true,
      },
      { key: 'authorId', type: 'varchar', size: 36, required: true },
      { key: 'authorName', type: 'varchar', size: 128, required: true },
      { key: 'source', type: 'enum', elements: ['app', 'scout'], required: true },
    ],
    indexes: [
      { key: 'by_account', type: 'key', attributes: ['accountId'] },
      { key: 'body_search', type: 'fulltext', attributes: ['body'] },
    ],
  },
  {
    tableId: 'tasks',
    name: 'Tasks',
    permissions: workspaceCanCreate,
    columns: [
      { key: 'title', type: 'varchar', size: 200, required: true },
      { key: 'dueDate', type: 'datetime', required: true },
      { key: 'done', type: 'boolean', required: true },
      { key: 'accountId', type: 'varchar', size: 36, required: false },
      { key: 'accountName', type: 'varchar', size: 128, required: false },
      { key: 'source', type: 'enum', elements: ['app', 'scout'], required: true },
    ],
    indexes: [{ key: 'by_account', type: 'key', attributes: ['accountId'] }],
  },
  {
    tableId: 'threads',
    name: 'Threads',
    permissions: workspaceCanCreate,
    columns: [
      { key: 'title', type: 'varchar', size: 120, required: true },
      { key: 'lastRunAt', type: 'datetime', required: false },
    ],
    indexes: [],
  },
  {
    tableId: 'runs',
    name: 'Runs',
    permissions: workspaceCanCreate,
    columns: [
      { key: 'threadId', type: 'varchar', size: 36, required: true },
      { key: 'prompt', type: 'varchar', size: 2000, required: true },
      { key: 'status', type: 'enum', elements: ['running', 'completed', 'failed'], required: true },
      { key: 'answer', type: 'text', required: false },
      { key: 'error', type: 'varchar', size: 300, required: false },
      { key: 'records', type: 'text', required: false },
      { key: 'readCount', type: 'integer', min: 0, required: true },
      { key: 'writeCount', type: 'integer', min: 0, required: true },
      { key: 'durationMs', type: 'integer', min: 0, required: false },
    ],
    indexes: [{ key: 'by_thread_status', type: 'key', attributes: ['threadId', 'status'] }],
  },
  {
    tableId: 'steps',
    name: 'Steps',
    permissions: workspaceCanCreate,
    columns: [
      { key: 'runId', type: 'varchar', size: 36, required: true },
      { key: 'position', type: 'integer', min: 0, required: true },
      { key: 'tool', type: 'varchar', size: 32, required: true },
      { key: 'label', type: 'varchar', size: 160, required: true },
      { key: 'detail', type: 'varchar', size: 240, required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['running', 'done', 'denied', 'error'],
        required: true,
      },
      { key: 'records', type: 'text', required: false },
    ],
    indexes: [{ key: 'by_run', type: 'key', attributes: ['runId'] }],
  },
];
