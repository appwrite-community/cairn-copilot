import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppwriteException } from 'appwrite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { functions, SCOUT_FUNCTION_ID, table, tablesDB } from '@/lib/appwrite';
import { threadQuery, threadsQuery, type ThreadData } from '@/lib/queries';
import { subscribeToScout, useSubscription, type RowChange } from '@/lib/realtime';
import { startRun } from '@/lib/scout';
import { useSession } from '@/lib/session';
import type { Run, Step } from '@/lib/types';

/** A run as the panel shows it. queued: the execution exists, the function has not written the run yet. */
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted';

export type RunView = {
  id: string;
  prompt: string;
  status: RunStatus;
  run: Run | null;
  steps: Step[];
  error: string | null;
};

type PendingRun = { id: string; threadId: string | null; prompt: string; error: string | null };

type ScoutContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  threadId: string | null;
  selectThread: (threadId: string | null) => void;
  runs: RunView[];
  loadingThread: boolean;
  busy: boolean;
  draft: string;
  setDraft: (text: string) => void;
  ask: (prompt: string) => void;
  /** Opens the panel with text in the composer, without sending it. */
  prefill: (prompt: string) => void;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
};

const ScoutContext = createContext<ScoutContextValue | null>(null);

// A run cannot outlive the execution JWT: function timeout (180 s) plus 60 s.
const RUN_LIFETIME_MS = 240_000;
// After the execution finishes, the run row gets one second to catch up.
const RECHECK_DELAY_MS = 1000;

export function ScoutProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const [open, setOpenState] = useState(() => localStorage.getItem('cairn:scout-open') === 'true');
  const [threadId, setThreadId] = useState<string | null>(
    () => localStorage.getItem(`cairn:scout-thread:${user.$id}`) || null,
  );
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingRun[]>([]);
  const [interrupted, setInterrupted] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    localStorage.setItem('cairn:scout-open', String(value));
  }, []);

  const selectThread = useCallback(
    (id: string | null) => {
      setThreadId(id);
      if (id) localStorage.setItem(`cairn:scout-thread:${user.$id}`, id);
      else localStorage.removeItem(`cairn:scout-thread:${user.$id}`);
    },
    [user.$id],
  );

  const threads = useQuery(threadsQuery);
  const thread = useQuery({ ...threadQuery(threadId ?? ''), enabled: threadId !== null });

  // A remembered thread that no longer exists starts a new conversation.
  useEffect(() => {
    if (threadId && threads.data && !threads.data.some((t) => t.$id === threadId)) {
      const isNew = pendingRef.current.some((p) => p.threadId === threadId);
      if (!isNew) selectThread(null);
    }
  }, [threadId, threads.data, selectThread]);

  const markInterrupted = useCallback((runId: string) => {
    setInterrupted((current) => new Set(current).add(runId));
  }, []);

  const upsertRun = useCallback(
    (run: Run) => {
      queryClient.setQueryData<ThreadData>(threadQuery(run.threadId).queryKey, (data) => {
        if (data) return { ...data, runs: upsert(data.runs, run) };
        // First event of a brand-new conversation: the cache starts here.
        const isOurs = pendingRef.current.some((p) => p.id === run.$id);
        return isOurs ? { runs: [run], steps: [] } : undefined;
      });
    },
    [queryClient],
  );

  /** The execution finished. If its run is still "running" a second later, the run stopped early. */
  const recheck = useCallback(
    (runId: string) => {
      setTimeout(async () => {
        try {
          const run = await tablesDB.getRow<Run>({ ...table('runs'), rowId: runId });
          upsertRun(run);
          if (run.status === 'running') markInterrupted(runId);
        } catch (err) {
          if (err instanceof AppwriteException && err.code === 404) {
            setPending((list) =>
              list.map((p) =>
                p.id === runId ? { ...p, error: "Scout couldn't start this request." } : p,
              ),
            );
          }
        }
      }, RECHECK_DELAY_MS);
    },
    [markInterrupted, upsertRun],
  );

  useSubscription(
    () =>
      subscribeToScout({
        onRun: ({ row }: RowChange<Run>) => {
          upsertRun(row);
          setPending((list) => list.filter((p) => p.id !== row.$id));
        },
        onStep: ({ row }: RowChange<Step>) => {
          const threadOfRun = findThreadOfRun(row.runId);
          if (!threadOfRun) return;
          queryClient.setQueryData<ThreadData>(threadQuery(threadOfRun).queryKey, (data) =>
            data ? { ...data, steps: upsert(data.steps, row) } : data,
          );
        },
        onExecution: (execution) => {
          if (execution.resourceId !== SCOUT_FUNCTION_ID) return;
          if (execution.status === 'completed' || execution.status === 'failed') {
            recheck(execution.$id);
          }
        },
      }),
    [],
  );

  function findThreadOfRun(runId: string) {
    const fromPending = pendingRef.current.find((p) => p.id === runId)?.threadId;
    if (fromPending) return fromPending;
    for (const [, data] of queryClient.getQueriesData<ThreadData>({ queryKey: ['thread'] })) {
      const run = data?.runs.find((r) => r.$id === runId);
      if (run) return run.threadId;
    }
    return null;
  }

  // Runs that were still "running" when the thread loaded: ask Appwrite whether
  // the execution behind each one is still going.
  const checkedRuns = useRef(new Set<string>());
  useEffect(() => {
    for (const run of thread.data?.runs ?? []) {
      if (run.status !== 'running' || checkedRuns.current.has(run.$id)) continue;
      checkedRuns.current.add(run.$id);
      if (Date.now() - new Date(run.$createdAt).getTime() > RUN_LIFETIME_MS) {
        markInterrupted(run.$id);
        continue;
      }
      functions
        .getExecution({ functionId: SCOUT_FUNCTION_ID, executionId: run.$id })
        .then((execution) => {
          if (execution.status === 'completed' || execution.status === 'failed') {
            markInterrupted(run.$id);
          }
        })
        .catch((err) => {
          if (err instanceof AppwriteException && err.code === 404) markInterrupted(run.$id);
        });
    }
  }, [thread.data, markInterrupted]);

  const runs = useMemo(() => {
    const data = thread.data;
    const views: RunView[] = (data?.runs ?? []).map((run) => ({
      id: run.$id,
      prompt: run.prompt,
      run,
      steps: (data?.steps ?? [])
        .filter((step) => step.runId === run.$id)
        .sort((a, b) => a.position - b.position),
      status: run.status === 'running' && interrupted.has(run.$id) ? 'interrupted' : run.status,
      error: run.error,
    }));
    const known = new Set(views.map((v) => v.id));
    for (const p of pending) {
      if (p.threadId !== threadId || known.has(p.id)) continue;
      views.push({
        id: p.id,
        prompt: p.prompt,
        run: null,
        steps: [],
        status: p.error ? 'failed' : 'queued',
        error: p.error,
      });
    }
    return views;
  }, [thread.data, pending, interrupted, threadId]);

  const busy = runs.some((r) => r.status === 'queued' || r.status === 'running');

  const ask = useCallback(
    async (prompt: string) => {
      const localId = `local-${crypto.randomUUID()}`;
      const startThread = threadId;
      setPending((list) => [...list, { id: localId, threadId: startThread, prompt, error: null }]);
      setDraft('');

      try {
        const started = await startRun({ threadId: startThread, prompt });
        setPending((list) =>
          list.map((p) =>
            p.id === localId ? { ...p, id: started.runId, threadId: started.threadId } : p,
          ),
        );
        if (started.threadId !== startThread) {
          selectThread(started.threadId);
          queryClient.invalidateQueries({ queryKey: threadsQuery.queryKey });
        }
      } catch (err) {
        setPending((list) =>
          list.map((p) => (p.id === localId ? { ...p, error: startErrorMessage(err) } : p)),
        );
      }
    },
    [threadId, selectThread, queryClient],
  );

  const prefill = useCallback(
    (prompt: string) => {
      setDraft(prompt);
      setOpen(true);
      requestAnimationFrame(() => {
        const composer = composerRef.current;
        composer?.focus();
        composer?.setSelectionRange(prompt.length, prompt.length);
      });
    },
    [setOpen],
  );

  const value = useMemo<ScoutContextValue>(
    () => ({
      open,
      setOpen,
      threadId,
      selectThread,
      runs,
      loadingThread: threadId !== null && thread.isPending,
      busy,
      draft,
      setDraft,
      ask,
      prefill,
      composerRef,
    }),
    [open, setOpen, threadId, selectThread, runs, thread.isPending, busy, draft, ask, prefill],
  );

  return <ScoutContext.Provider value={value}>{children}</ScoutContext.Provider>;
}

export function useScout() {
  const context = useContext(ScoutContext);
  if (!context) throw new Error('useScout must be used inside ScoutProvider');
  return context;
}

function upsert<T extends { $id: string }>(list: T[], row: T) {
  const index = list.findIndex((item) => item.$id === row.$id);
  if (index === -1) return [...list, row];
  const next = list.slice();
  next[index] = row;
  return next;
}

function startErrorMessage(err: unknown) {
  if (err instanceof AppwriteException) {
    if (err.code === 401) return 'Scout is available to members of the workspace team.';
    if (err.code === 429) return 'Too many requests. Wait a moment and try again.';
  }
  return "Couldn't reach Scout. Check your connection and try again.";
}
