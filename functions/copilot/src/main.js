import { Account, AppwriteException, Query, TablesDB, Teams } from 'node-appwrite';
import OpenAI from 'openai';
import { runAgent } from './agent.js';
import { table, userClient } from './appwrite.js';
import { SessionEndedError, isSessionError, runErrorMessage } from './errors.js';
import { systemPrompt } from './prompt.js';
import { createRunLog } from './run-log.js';
import { createToolbox } from './tools.js';

const HISTORY_RUNS = 6;
// The execution JWT expires 60 s after the function timeout (180 s), so a
// run older than this can no longer be running.
const RUN_LIFETIME_MS = 240_000;

/**
 * Scout. The web app starts this function with an asynchronous execution and
 * follows the run through Realtime. The function has no API key scopes: the
 * caller's JWT is its only credential.
 */
export default async ({ req, res, log, error }) => {
  const startedAt = Date.now();

  const client = userClient(req);
  if (!client) return res.json({ error: 'Sign in to use Scout.' }, 401);

  const input = parseInput(req);
  if (input.error) return res.json({ error: input.error }, 400);
  const { threadId, prompt, timeZone } = input;

  const tablesDB = new TablesDB(client);
  const runId = req.headers['x-appwrite-execution-id'];
  let runLog;

  try {
    const [me, { teams }] = await Promise.all([
      new Account(client).get(),
      new Teams(client).list(),
    ]);
    // Threads belong to the user who created them, so this also checks ownership.
    const thread = await getRowOrNull(tablesDB, 'threads', threadId);
    if (!thread) return res.json({ error: 'Thread not found.' }, 400);

    // The execution ID is the run ID. If the row already exists, this
    // execution was delivered twice and the first delivery owns the run.
    let run;
    try {
      run = await tablesDB.createRow({
        ...table('runs'),
        rowId: runId,
        data: { threadId, prompt, status: 'running', readCount: 0, writeCount: 0 },
      });
    } catch (err) {
      if (err.type === 'row_already_exists') return res.empty();
      throw err;
    }
    runLog = createRunLog(tablesDB, runId);

    if (await hasEarlierActiveRun(tablesDB, run)) {
      await runLog.fail('Scout is still working on your previous message.', Date.now() - startedAt);
      return res.empty();
    }
    if (!process.env.OPENROUTER_API_KEY) {
      error('OPENROUTER_API_KEY is not set on the function.');
      await runLog.fail(
        'Scout is not set up yet: the function has no OPENROUTER_API_KEY.',
        Date.now() - startedAt,
      );
      return res.empty();
    }

    const messages = [
      { role: 'system', content: systemPrompt({ me, teams, timeZone }) },
      ...(await threadHistory(tablesDB, threadId)),
      { role: 'user', content: prompt },
    ];
    const toolbox = createToolbox({
      tablesDB,
      me,
      workspaceName: teams.find((team) => team.$id === 'workspace')?.name ?? 'the workspace',
      timeZone,
    });
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: 30_000,
      maxRetries: 1,
    });

    const { answer, rounds } = await runAgent({ openrouter, messages, toolbox, runLog, startedAt });
    const durationMs = Date.now() - startedAt;
    await runLog.complete({ answer, threadId, durationMs });

    const { steps, readCount, writeCount } = runLog.stats();
    log(
      `Run ${runId} completed in ${durationMs} ms: ${rounds} rounds, ${steps} steps, ${readCount} rows read, ${writeCount} rows written.`,
    );
    return res.empty();
  } catch (err) {
    if (err instanceof SessionEndedError || isSessionError(err)) {
      // The user signed out or the JWT expired. Nothing can be written as them anymore.
      log(`Run ${runId} stopped: the session that started it has ended.`);
      return res.empty();
    }
    // Log the code, type, and message only. Appwrite and OpenRouter error
    // objects can carry request details that do not belong in logs.
    error(`Run ${runId} failed: ${describe(err)}`);
    await runLog?.fail(runErrorMessage(err), Date.now() - startedAt).catch(() => {});
    return res.empty();
  }
};

/** Validates the JSON body the web app sends. */
function parseInput(req) {
  let body;
  try {
    body = req.bodyJson;
  } catch {
    return { error: 'Send a JSON body.' };
  }
  const { threadId, prompt, timeZone = 'UTC' } = body ?? {};

  if (typeof threadId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(threadId)) {
    return { error: 'threadId must be a row ID.' };
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
    return { error: 'prompt must be 1 to 2000 characters.' };
  }
  if (typeof timeZone !== 'string' || !isTimeZone(timeZone)) {
    return { error: 'timeZone must be an IANA time zone, such as Europe/Berlin.' };
  }
  return { threadId, prompt: prompt.trim(), timeZone };
}

/** One run at a time per thread: a later run fails while an earlier one is still working. */
async function hasEarlierActiveRun(tablesDB, run) {
  const { total } = await tablesDB.listRows({
    ...table('runs'),
    queries: [
      Query.equal('threadId', run.threadId),
      Query.equal('status', 'running'),
      Query.notEqual('$id', run.$id),
      Query.createdBetween(new Date(Date.now() - RUN_LIFETIME_MS).toISOString(), run.$createdAt),
      Query.limit(1),
    ],
  });
  return total > 0;
}

/** The last completed runs of the thread, as user and assistant messages. */
async function threadHistory(tablesDB, threadId) {
  const { rows } = await tablesDB.listRows({
    ...table('runs'),
    queries: [
      Query.equal('threadId', threadId),
      Query.equal('status', 'completed'),
      Query.orderDesc('$createdAt'),
      Query.limit(HISTORY_RUNS),
    ],
  });
  return rows.reverse().flatMap((run) => [
    { role: 'user', content: run.prompt },
    { role: 'assistant', content: run.answer },
  ]);
}

async function getRowOrNull(tablesDB, tableId, rowId) {
  try {
    return await tablesDB.getRow({ ...table(tableId), rowId });
  } catch (err) {
    if (err.type === 'row_not_found') return null;
    throw err;
  }
}

function isTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function describe(err) {
  if (err instanceof AppwriteException) return `${err.code} ${err.type}: ${err.message}`;
  if (err instanceof OpenAI.APIError)
    return `OpenRouter ${err.status ?? 'connection'} error: ${err.message}`;
  return err?.message ?? String(err);
}
