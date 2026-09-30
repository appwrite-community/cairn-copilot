import { ID, Query } from 'node-appwrite';
import { table } from './appwrite.js';
import { notAllowed, toToolResult } from './errors.js';
import { notePermissions, visibilityOf } from './permissions.js';

const STAGES = ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
const HEALTH = ['healthy', 'watch', 'at_risk'];
const NOTE_KINDS = ['call', 'meeting', 'email', 'internal'];
const VISIBILITIES = ['workspace', 'private', 'leadership'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Scout's tools. None of them checks permissions: every call goes through
 * the user's JWT client, and Appwrite returns only what the user can read
 * and accepts only the changes the user is allowed to make.
 *
 * Each tool has a definition for the model, a label for the step timeline,
 * and a run function. run returns the result for the model (forModel), a
 * short detail for the timeline, and the rows it read or wrote.
 */
const TOOLS = {
  search_records: {
    definition: tool(
      'search_records',
      'Find accounts by company name and contacts by person name.',
      {
        query: { type: 'string', description: 'A company or person name, or part of one.' },
      },
    ),
    label: ({ query }) => `Searching for "${query}"`,
    async run({ query }, { tablesDB }) {
      const search = [Query.search('name', query), Query.limit(5)];
      const [accounts, contacts] = await Promise.all([
        tablesDB.listRows({ ...table('accounts'), queries: search }),
        tablesDB.listRows({ ...table('contacts'), queries: search }),
      ]);
      return {
        forModel: {
          accounts: accounts.rows.map((a) => ({
            id: a.$id,
            name: a.name,
            industry: a.industry,
            health: a.health,
            owner: a.ownerName,
          })),
          contacts: contacts.rows.map(contactView),
        },
        detail: counts([accounts.rows.length, 'account'], [contacts.rows.length, 'contact']),
        read: [...accounts.rows.map(accountRecord), ...contacts.rows.map(contactRecord)],
      };
    },
  },

  list_accounts: {
    definition: tool(
      'list_accounts',
      'List accounts the user can see, filtered by health or owner.',
      {
        health: nullable({
          type: 'string',
          enum: HEALTH,
          description: 'Only accounts with this health.',
        }),
        ownedByMe: { type: 'boolean', description: 'Only accounts the user owns.' },
      },
    ),
    label: ({ health, ownedByMe }) =>
      `Listing ${ownedByMe ? 'your ' : ''}${health ? `${health.replace('_', '-')} ` : ''}accounts`,
    async run({ health, ownedByMe }, { tablesDB, me }) {
      const queries = [Query.orderAsc('name'), Query.limit(25)];
      if (health) queries.push(Query.equal('health', health));
      if (ownedByMe) queries.push(Query.equal('ownerId', me.$id));

      const { total, rows } = await tablesDB.listRows({ ...table('accounts'), queries });
      return {
        forModel: {
          total,
          accounts: rows.map((a) => ({
            id: a.$id,
            name: a.name,
            industry: a.industry,
            health: a.health,
            arr: a.arr,
            renewalDate: dateOnly(a.renewalDate),
            owner: a.ownerName,
          })),
        },
        detail: plural(rows.length, 'account'),
        read: rows.map(accountRecord),
      };
    },
  },

  get_account: {
    definition: tool('get_account', 'Read one account with its details and contacts.', {
      accountId: { type: 'string', description: 'Account ID from search_records.' },
    }),
    label: ({ accountId }, names) => `Reading ${names.get(accountId) ?? 'an account'}`,
    async run({ accountId }, { tablesDB }) {
      const account = await tablesDB.getRow({ ...table('accounts'), rowId: accountId });
      const contacts = await tablesDB.listRows({
        ...table('contacts'),
        queries: [Query.equal('accountId', accountId), Query.limit(10)],
      });
      return {
        forModel: {
          account: {
            id: account.$id,
            name: account.name,
            domain: account.domain,
            industry: account.industry,
            segment: account.segment,
            lifecycle: account.lifecycle,
            health: account.health,
            arr: account.arr,
            renewalDate: dateOnly(account.renewalDate),
            owner: account.ownerName,
            summary: account.summary,
          },
          contacts: contacts.rows.map(contactView),
        },
        label: `Reading ${account.name}`,
        detail: counts([1, 'account'], [contacts.rows.length, 'contact']),
        read: [accountRecord(account), ...contacts.rows.map(contactRecord)],
      };
    },
  },

  list_deals: {
    definition: tool('list_deals', 'List deals the user can see, ordered by close date.', {
      accountId: nullable({ type: 'string', description: 'Only deals on this account.' }),
      stage: nullable({ type: 'string', enum: STAGES, description: 'Only deals in this stage.' }),
      ownedByMe: { type: 'boolean', description: 'Only deals the user owns.' },
    }),
    label: ({ accountId, ownedByMe }, names) =>
      accountId
        ? `Listing deals on ${names.get(accountId) ?? 'an account'}`
        : ownedByMe
          ? 'Listing your deals'
          : 'Listing deals',
    async run({ accountId, stage, ownedByMe }, { tablesDB, me }) {
      const queries = [Query.orderAsc('closeDate'), Query.limit(25)];
      if (accountId) queries.push(Query.equal('accountId', accountId));
      if (stage) queries.push(Query.equal('stage', stage));
      if (ownedByMe) queries.push(Query.equal('ownerId', me.$id));

      const { total, rows } = await tablesDB.listRows({ ...table('deals'), queries });
      return {
        forModel: { total, deals: rows.map(dealView) },
        label: accountId && rows[0] ? `Listing deals on ${rows[0].accountName}` : undefined,
        detail: plural(rows.length, 'deal'),
        read: rows.map(dealRecord),
      };
    },
  },

  list_notes: {
    definition: tool(
      'list_notes',
      'List notes the user can read, newest first. For a question about one account, pass its ID without a query and read the notes.',
      {
        accountId: nullable({ type: 'string', description: 'Only notes on this account.' }),
        query: nullable({
          type: 'string',
          description:
            'Whole words that appear in the note text, such as a name or product. Use null to read the latest notes.',
        }),
        limit: { type: 'integer', description: 'How many notes to return, from 1 to 20.' },
      },
    ),
    label: ({ accountId, query }, names) =>
      notesLabel(accountId && (names.get(accountId) ?? 'an account'), query),
    async run({ accountId, query, limit }, { tablesDB, timeZone }) {
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(Math.max(limit, 1), 20)),
      ];
      if (accountId) queries.push(Query.equal('accountId', accountId));
      if (query) queries.push(Query.search('body', query));

      const { total, rows } = await tablesDB.listRows({ ...table('notes'), queries });
      return {
        forModel: {
          total,
          notes: rows.map((note) => ({
            id: note.$id,
            accountName: note.accountName,
            kind: note.kind,
            author: note.authorName,
            createdAt: localDate(note.$createdAt, timeZone),
            visibility: visibilityOf(note),
            source: note.source,
            body: note.body,
          })),
        },
        label: accountId && rows[0] ? notesLabel(rows[0].accountName, query) : undefined,
        detail: plural(rows.length, 'note'),
        read: rows.map(noteRecord),
      };
    },
  },

  list_tasks: {
    definition: tool('list_tasks', "List the user's own tasks, soonest due first.", {
      accountId: nullable({ type: 'string', description: 'Only tasks for this account.' }),
      includeDone: { type: 'boolean', description: 'Also return completed tasks.' },
    }),
    label: ({ accountId }, names) =>
      accountId
        ? `Checking your tasks on ${names.get(accountId) ?? 'an account'}`
        : 'Checking your tasks',
    async run({ accountId, includeDone }, { tablesDB }) {
      const queries = [Query.orderAsc('dueDate'), Query.limit(25)];
      if (accountId) queries.push(Query.equal('accountId', accountId));
      if (!includeDone) queries.push(Query.equal('done', false));

      const { rows } = await tablesDB.listRows({ ...table('tasks'), queries });
      return {
        forModel: {
          tasks: rows.map((task) => ({
            id: task.$id,
            title: task.title,
            dueDate: dateOnly(task.dueDate),
            done: task.done,
            accountName: task.accountName,
          })),
        },
        label: accountId && rows[0] ? `Checking your tasks on ${rows[0].accountName}` : undefined,
        detail: plural(rows.length, 'task'),
        read: rows.map(taskRecord),
      };
    },
  },

  create_note: {
    // Every user gets the same three choices. Appwrite rejects a note shared
    // with a team the user is not in, and the model hears "not_allowed".
    definition: tool('create_note', 'Add a note to an account.', {
      accountId: { type: 'string', description: 'Account ID from search_records.' },
      body: { type: 'string', description: 'The note text, up to 2000 characters.' },
      kind: {
        type: 'string',
        enum: NOTE_KINDS,
        description:
          'call, meeting, or email when the note records one. internal for anything else.',
      },
      visibility: {
        type: 'string',
        enum: VISIBILITIES,
        description:
          'Who can read the note. workspace: everyone in the company. private: only the user. leadership: the Leadership team.',
      },
    }),
    label: ({ accountId }, names) => `Adding a note to ${names.get(accountId) ?? 'an account'}`,
    async run({ accountId, body, kind, visibility }, { tablesDB, me, workspaceName }) {
      if (body.length > 2000) return invalid('The note must be 2000 characters or fewer.');
      if (!VISIBILITIES.includes(visibility)) return invalid(`Unknown visibility ${visibility}.`);

      const account = await tablesDB.getRow({ ...table('accounts'), rowId: accountId });
      const audience = { workspace: workspaceName, private: 'only you', leadership: 'Leadership' }[
        visibility
      ];
      let note;
      try {
        note = await tablesDB.createRow({
          ...table('notes'),
          rowId: ID.unique(),
          data: {
            accountId,
            accountName: account.name,
            body,
            kind,
            authorId: me.$id,
            authorName: me.name,
            source: 'scout',
          },
          permissions: notePermissions(visibility, me.$id),
        });
      } catch (err) {
        if (err.type !== 'user_unauthorized') throw err;
        // Users can only grant roles they hold, such as teams they belong to.
        return notAllowed({
          detail: `Not allowed: sharing with ${audience}`,
          reason: 'The user can only share notes with teams they belong to.',
        });
      }
      return {
        forModel: { created: { id: note.$id, visibility, accountName: account.name } },
        label: `Adding a note to ${account.name}`,
        detail: visibility === 'private' ? 'Only you' : `Shared with ${audience}`,
        wrote: [noteRecord(note)],
      };
    },
  },

  create_task: {
    definition: tool(
      'create_task',
      'Create a follow-up task for the user. Only the user can see it.',
      {
        title: { type: 'string', description: 'What to do, up to 200 characters.' },
        dueDate: { type: 'string', description: 'Due date as YYYY-MM-DD.' },
        accountId: nullable({ type: 'string', description: 'The account the task is about.' }),
      },
    ),
    label: () => 'Creating a task',
    async run({ title, dueDate, accountId }, { tablesDB }) {
      if (title.length > 200) return invalid('The title must be 200 characters or fewer.');
      if (!isDateOnly(dueDate)) return invalid('dueDate must be a valid date as YYYY-MM-DD.');

      const account = accountId
        ? await tablesDB.getRow({ ...table('accounts'), rowId: accountId })
        : null;
      // No permissions argument: Appwrite gives the row to the user who creates it.
      const task = await tablesDB.createRow({
        ...table('tasks'),
        rowId: ID.unique(),
        data: {
          title,
          dueDate: noonUtc(dueDate),
          done: false,
          accountId: account?.$id ?? null,
          accountName: account?.name ?? null,
          source: 'scout',
        },
      });
      return {
        forModel: { created: { id: task.$id, title, dueDate } },
        detail: `Due ${formatDate(dueDate)}`,
        wrote: [taskRecord(task)],
      };
    },
  },

  update_deal: {
    definition: tool(
      'update_deal',
      'Change the stage, close date, or next step of a deal. Pass null for fields that stay the same.',
      {
        dealId: { type: 'string', description: 'Deal ID from list_deals.' },
        stage: nullable({ type: 'string', enum: STAGES }),
        closeDate: nullable({ type: 'string', description: 'New close date as YYYY-MM-DD.' }),
        nextStep: nullable({ type: 'string', description: 'New next step, up to 256 characters.' }),
      },
    ),
    label: ({ dealId }, names) => `Updating ${names.get(dealId) ?? 'a deal'}`,
    async run({ dealId, stage, closeDate, nextStep }, { tablesDB, me }) {
      if (closeDate && !isDateOnly(closeDate))
        return invalid('closeDate must be a valid date as YYYY-MM-DD.');
      if (nextStep && nextStep.length > 256)
        return invalid('nextStep must be 256 characters or fewer.');

      const deal = await tablesDB.getRow({ ...table('deals'), rowId: dealId });
      const label = `Updating ${deal.name}`;
      const changes = {};
      if (stage && stage !== deal.stage) changes.stage = stage;
      if (closeDate && closeDate !== dateOnly(deal.closeDate))
        changes.closeDate = noonUtc(closeDate);
      if (nextStep && nextStep !== deal.nextStep) changes.nextStep = nextStep;

      // An update that changes nothing only needs read access, so Appwrite
      // would accept it even on a deal the user cannot change. Skip it.
      if (Object.keys(changes).length === 0) {
        return {
          forModel: { unchanged: true, deal: dealView(deal) },
          label,
          detail: 'Already up to date',
          read: [dealRecord(deal)],
        };
      }

      try {
        const updated = await tablesDB.updateRow({
          ...table('deals'),
          rowId: dealId,
          data: { ...changes, updatedByName: me.name, updatedVia: 'scout' },
        });
        return {
          forModel: { updated: dealView(updated) },
          label,
          detail: describeChanges(changes),
          wrote: [dealRecord(updated)],
        };
      } catch (err) {
        if (err.type !== 'user_unauthorized') throw err;
        return {
          ...notAllowed({
            owner: deal.ownerName,
            detail: `Not allowed: ${deal.ownerName} owns this deal`,
          }),
          label,
          read: [dealRecord(deal)],
        };
      }
    },
  },
};

/**
 * The tools for one run. ctx holds the user's TablesDB client and profile.
 * names remembers the account and deal names seen so far, so a step can
 * show "Reading Alder Freight" instead of an ID while it runs.
 */
export function createToolbox(ctx) {
  const names = new Map();

  return {
    definitions: Object.values(TOOLS).map((t) => t.definition),

    label(call) {
      const t = TOOLS[call.function.name];
      const args = parseArguments(call.function.arguments);
      return t && args ? t.label(args, names) : `Running ${call.function.name}`;
    },

    async run(call) {
      const t = TOOLS[call.function.name];
      const args = parseArguments(call.function.arguments);
      if (!t) return invalid(`There is no tool named ${call.function.name}.`);
      if (!args) return invalid('The tool arguments were not valid JSON.');

      try {
        const result = await t.run(args, ctx);
        for (const record of [...(result.read ?? []), ...(result.wrote ?? [])]) {
          if (record.table === 'accounts' || record.table === 'deals')
            names.set(record.id, record.label);
        }
        return { status: 'done', ...result };
      } catch (err) {
        return toToolResult(err);
      }
    },
  };
}

// Schema helpers -------------------------------------------------------------

/** A function tool with a strict schema: every property is required, and optional ones accept null. */
function tool(name, description, properties) {
  return {
    type: 'function',
    function: {
      name,
      description,
      strict: true,
      parameters: {
        type: 'object',
        properties,
        required: Object.keys(properties),
        additionalProperties: false,
      },
    },
  };
}

function nullable(schema) {
  return {
    ...schema,
    type: [schema.type, 'null'],
    ...(schema.enum && { enum: [...schema.enum, null] }),
  };
}

function parseArguments(json) {
  try {
    const args = JSON.parse(json);
    return args && typeof args === 'object' && !Array.isArray(args) ? args : null;
  } catch {
    return null;
  }
}

function invalid(message) {
  return { status: 'error', detail: 'Invalid request', forModel: { error: 'invalid', message } };
}

// Views and records ----------------------------------------------------------

function contactView(c) {
  return {
    id: c.$id,
    name: c.name,
    title: c.title,
    email: c.email,
    accountId: c.accountId,
    accountName: c.accountName,
  };
}

function dealView(d) {
  return {
    id: d.$id,
    name: d.name,
    accountId: d.accountId,
    accountName: d.accountName,
    amount: d.amount,
    stage: d.stage,
    closeDate: dateOnly(d.closeDate),
    owner: d.ownerName,
    nextStep: d.nextStep,
  };
}

// Records feed the Sources chips under an answer and the run's read and write counts.
const accountRecord = (a) => ({ table: 'accounts', id: a.$id, label: a.name, accountId: a.$id });
const contactRecord = (c) => ({
  table: 'contacts',
  id: c.$id,
  label: c.name,
  accountId: c.accountId,
});
const dealRecord = (d) => ({ table: 'deals', id: d.$id, label: d.name, accountId: d.accountId });
const noteRecord = (n) => ({
  table: 'notes',
  id: n.$id,
  label: excerpt(n.body),
  accountId: n.accountId,
});
const taskRecord = (t) => ({
  table: 'tasks',
  id: t.$id,
  label: t.title,
  accountId: t.accountId ?? null,
});

// Formatting -----------------------------------------------------------------

// Close dates, due dates, and renewal dates are calendar dates stored at 12:00 UTC.
const dateOnly = (iso) => (iso ? iso.slice(0, 10) : null);
const noonUtc = (date) => `${date}T12:00:00.000Z`;

function isDateOnly(value) {
  if (!DATE_ONLY.test(value)) return false;
  const date = new Date(noonUtc(value));
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function localDate(iso, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function formatDate(date) {
  return new Date(noonUtc(date)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function describeChanges({ stage, closeDate, nextStep }) {
  const parts = [];
  if (stage) parts.push(`Stage: ${stage.replace('_', ' ')}`);
  if (closeDate) parts.push(`Close date: ${formatDate(dateOnly(closeDate))}`);
  if (nextStep) parts.push('Next step updated');
  return parts.join(' · ');
}

function notesLabel(accountName, query) {
  if (accountName && query) return `Searching notes on ${accountName} for "${query}"`;
  if (accountName) return `Reading notes on ${accountName}`;
  return query ? `Searching notes for "${query}"` : 'Reading recent notes';
}

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const counts = (...pairs) => pairs.map(([n, noun]) => plural(n, noun)).join(', ');
const excerpt = (text) => (text.length > 80 ? `${text.slice(0, 79)}…` : text);
