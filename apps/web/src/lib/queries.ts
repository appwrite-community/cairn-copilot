import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { table, tablesDB } from './appwrite';
import type { Account, Contact, Deal, Health, Note, Run, Step, Task, Thread } from './types';

/**
 * Every query runs with the signed-in user's session, so Appwrite returns
 * only the rows the user can read. Nothing here filters by permission.
 */

export type AccountFilters = { search: string; health: Health | null };

export const accountsQuery = ({ search, health }: AccountFilters) =>
  queryOptions({
    queryKey: ['accounts', { search, health }],
    queryFn: async () => {
      const queries = [Query.orderAsc('name'), Query.limit(100)];
      if (search) queries.push(Query.search('name', search));
      if (health) queries.push(Query.equal('health', health));
      return tablesDB.listRows<Account>({ ...table('accounts'), queries });
    },
    placeholderData: keepPreviousData,
  });

export const accountQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['accounts', 'detail', accountId],
    queryFn: () => tablesDB.getRow<Account>({ ...table('accounts'), rowId: accountId }),
    retry: false,
  });

export const contactsQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['contacts', accountId],
    queryFn: async () => {
      const { rows } = await tablesDB.listRows<Contact>({
        ...table('contacts'),
        queries: [Query.equal('accountId', accountId), Query.limit(25)],
      });
      return rows.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    },
  });

/** All deals the user can read. Only the Sales team gets any rows back. */
export const dealsQuery = queryOptions({
  queryKey: ['deals'],
  queryFn: async () => {
    const { rows } = await tablesDB.listRows<Deal>({
      ...table('deals'),
      queries: [Query.orderAsc('closeDate'), Query.limit(100)],
    });
    return rows;
  },
});

export const accountNotesQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['notes', 'account', accountId],
    queryFn: () =>
      tablesDB.listRows<Note>({
        ...table('notes'),
        queries: [
          Query.equal('accountId', accountId),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ],
      }),
  });

/** The latest notes across all accounts, for Today and the "Last note" column. */
export const recentNotesQuery = queryOptions({
  queryKey: ['notes', 'recent'],
  queryFn: async () => {
    const { rows } = await tablesDB.listRows<Note>({
      ...table('notes'),
      queries: [Query.orderDesc('$createdAt'), Query.limit(100)],
    });
    return rows;
  },
});

/** Tasks belong to the user who created them, so this is the user's own list. */
export const tasksQuery = queryOptions({
  queryKey: ['tasks'],
  queryFn: async () => {
    const { rows } = await tablesDB.listRows<Task>({
      ...table('tasks'),
      queries: [Query.orderAsc('dueDate'), Query.limit(200)],
    });
    return rows;
  },
});

export const threadsQuery = queryOptions({
  queryKey: ['threads'],
  queryFn: async () => {
    const { rows } = await tablesDB.listRows<Thread>({
      ...table('threads'),
      queries: [Query.orderDesc('$updatedAt'), Query.limit(20)],
    });
    return rows;
  },
});

export type ThreadData = { runs: Run[]; steps: Step[] };

/** A conversation with Scout: its latest runs, oldest first, and the steps of those runs. */
export const threadQuery = (threadId: string) =>
  queryOptions({
    queryKey: ['thread', threadId],
    queryFn: async (): Promise<ThreadData> => {
      const { rows } = await tablesDB.listRows<Run>({
        ...table('runs'),
        queries: [
          Query.equal('threadId', threadId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ],
      });
      const runs = rows.reverse();
      if (runs.length === 0) return { runs, steps: [] };

      const { rows: steps } = await tablesDB.listRows<Step>({
        ...table('steps'),
        queries: [
          Query.equal(
            'runId',
            runs.map((run) => run.$id),
          ),
          Query.orderAsc('position'),
          Query.limit(500),
        ],
      });
      return { runs, steps };
    },
    staleTime: Infinity,
  });
