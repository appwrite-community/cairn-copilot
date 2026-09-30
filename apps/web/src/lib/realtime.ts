import { Channel, type Models, type RealtimeSubscription } from 'appwrite';
import { useEffect, type DependencyList } from 'react';
import { DATABASE_ID, realtime } from './appwrite';
import type { Run, Step, TableId } from './types';

type RowAction = 'create' | 'update' | 'upsert' | 'delete';
export type RowChange<Row> = { tableId: TableId; action: RowAction; row: Row };

const rows = (tableId: TableId) => Channel.tablesdb(DATABASE_ID).table(tableId).row();

/**
 * Follows Scout while it works: the run and step rows the copilot function
 * writes, and the execution that runs it. There are no filters here.
 * The function writes those rows as the signed-in user, and executions
 * belong to the user who started them, so Appwrite delivers them to that
 * user only.
 */
export function subscribeToScout(handlers: {
  onRun: (change: RowChange<Run>) => void;
  onStep: (change: RowChange<Step>) => void;
  onExecution: (execution: Models.Execution) => void;
}) {
  return realtime.subscribe(
    [rows('runs'), rows('steps'), Channel.executions()],
    ({ events, channels, payload }) => {
      const change = rowChange(events);
      if (change?.tableId === 'runs') handlers.onRun({ ...change, row: payload as Run });
      else if (change?.tableId === 'steps') handlers.onStep({ ...change, row: payload as Step });
      else if (channels.includes(Channel.executions())) {
        handlers.onExecution(payload as Models.Execution);
      }
    },
  );
}

/** Changes to the CRM records the user can read, from the app, other people, or Scout. */
export function subscribeToRecords(onChange: (change: RowChange<Models.Row>) => void) {
  return realtime.subscribe(
    [rows('accounts'), rows('deals'), rows('notes'), rows('tasks')],
    ({ events, payload }) => {
      const change = rowChange(events);
      if (change) onChange({ ...change, row: payload as Models.Row });
    },
  );
}

/** Keeps a Realtime subscription open while the component is mounted. */
export function useSubscription(
  subscribe: () => Promise<RealtimeSubscription>,
  deps: DependencyList,
) {
  useEffect(() => {
    const subscription = subscribe();
    return () => {
      subscription.then((s) => s.unsubscribe()).catch(() => {});
    };
  }, deps);
}

const ROW_EVENT = new RegExp(
  `^tablesdb\\.${DATABASE_ID}\\.tables\\.([a-z]+)\\.rows\\.[^.]+\\.(create|update|upsert|delete)$`,
);

/** Reads the table and action from event names such as tablesdb.crm.tables.runs.rows.<id>.update. */
function rowChange(events: string[]) {
  for (const event of events) {
    const match = ROW_EVENT.exec(event);
    if (match) return { tableId: match[1] as TableId, action: match[2] as RowAction };
  }
  return null;
}
