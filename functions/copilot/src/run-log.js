import { ID } from 'node-appwrite';
import { table } from './appwrite.js';
import { SessionEndedError } from './errors.js';

const MAX_RECORDS_PER_RUN = 40;
const MAX_RECORDS_PER_STEP = 20;

/**
 * Records a run and its steps as the signed-in user. The rows get the user's
 * default permissions, so Realtime delivers them to that user only.
 *
 * Every write is also a session check: once the user signs out or the JWT
 * expires, the write fails and the run stops before Scout can build an
 * answer on reads that silently came back empty.
 */
export function createRunLog(tablesDB, runId) {
  const records = new Map();
  let position = 0;
  let readCount = 0;
  let writeCount = 0;

  const write = (request) =>
    request.catch((err) => {
      throw err.code === 401 ? new SessionEndedError(err) : err;
    });

  return {
    async startStep(tool, label) {
      return write(
        tablesDB.createRow({
          ...table('steps'),
          rowId: ID.unique(),
          data: { runId, position: position++, tool, label: clip(label, 160), status: 'running' },
        }),
      );
    },

    async finishStep(step, { status, detail, label, read = [], wrote = [] }) {
      readCount += read.length;
      writeCount += wrote.length;
      const touched = [...read, ...wrote];
      for (const record of touched) {
        if (records.size < MAX_RECORDS_PER_RUN) records.set(`${record.table}:${record.id}`, record);
      }

      await write(
        tablesDB.updateRow({
          ...table('steps'),
          rowId: step.$id,
          data: {
            status,
            detail: detail ? clip(detail, 240) : null,
            ...(label && { label: clip(label, 160) }),
            records: JSON.stringify(touched.slice(0, MAX_RECORDS_PER_STEP)),
          },
        }),
      );
    },

    async complete({ answer, threadId, durationMs }) {
      await write(
        tablesDB.updateRow({
          ...table('runs'),
          rowId: runId,
          data: {
            status: 'completed',
            answer,
            records: JSON.stringify([...records.values()]),
            readCount,
            writeCount,
            durationMs,
          },
        }),
      );
      await write(
        tablesDB.updateRow({
          ...table('threads'),
          rowId: threadId,
          data: { lastRunAt: new Date().toISOString() },
        }),
      );
    },

    async fail(message, durationMs) {
      await write(
        tablesDB.updateRow({
          ...table('runs'),
          rowId: runId,
          data: { status: 'failed', error: clip(message, 300), readCount, writeCount, durationMs },
        }),
      );
    },

    stats: () => ({ steps: position, readCount, writeCount }),
  };
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
