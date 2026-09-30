import { ID } from 'appwrite';
import { functions, SCOUT_FUNCTION_ID, table, tablesDB } from './appwrite';
import type { RecordRef, Thread } from './types';

export const MAX_PROMPT_LENGTH = 2000;

/**
 * Starts a Scout run. The execution is asynchronous, so createExecution
 * returns at once and the function's progress arrives through Realtime.
 * Appwrite gives the function a JWT for the signed-in user, so Scout reads
 * and writes with this user's permissions.
 */
export async function startRun({ threadId, prompt }: { threadId: string | null; prompt: string }) {
  const thread = threadId ?? (await createThread(prompt)).$id;

  const execution = await functions.createExecution({
    functionId: SCOUT_FUNCTION_ID,
    async: true,
    body: JSON.stringify({
      threadId: thread,
      prompt,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  // The function uses the execution ID as the ID of the run row it writes.
  return { threadId: thread, runId: execution.$id };
}

/** A new conversation. Without a permissions argument, only its creator can read it. */
function createThread(prompt: string) {
  return tablesDB.createRow<Thread>({
    ...table('threads'),
    rowId: ID.unique(),
    data: { title: prompt.replace(/\s+/g, ' ').trim().slice(0, 80), lastRunAt: null },
  });
}

export function parseRecords(json: string | null): RecordRef[] {
  if (!json) return [];
  try {
    const records: unknown = JSON.parse(json);
    return Array.isArray(records) ? (records as RecordRef[]) : [];
  } catch {
    return [];
  }
}
