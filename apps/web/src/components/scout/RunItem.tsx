import { ChevronRight, CircleAlert, Lock, RotateCcw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { plural } from '@/lib/format';
import { parseRecords } from '@/lib/scout';
import { cn } from '@/lib/utils';
import { Answer } from './Answer';
import type { AskOptions, RunView } from './ScoutProvider';
import { Sources } from './Sources';
import { StepList } from './StepList';

/** One question and Scout's work on it: steps, answer, and sources. */
export function RunItem({
  run,
  onRetry,
}: {
  run: RunView;
  onRetry: (prompt: string, options: AskOptions) => void;
}) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-md border border-border-strong bg-raised px-3 py-2 text-[14px] leading-[22px]">
          {run.prompt}
        </p>
      </div>
      <div className="flex gap-3">
        <ScoutMark size={24} className="mt-px" />
        <div className="min-w-0 flex-1">
          <RunBody
            run={run}
            onRetry={() => onRetry(run.prompt, { newThread: run.retryInNewThread })}
          />
        </div>
      </div>
    </article>
  );
}

function RunBody({ run, onRetry }: { run: RunView; onRetry: () => void }) {
  switch (run.status) {
    case 'queued':
      return (
        <div className="flex h-6 items-center">
          <span className="text-shimmer text-[13px]">Starting Scout…</span>
        </div>
      );

    case 'running': {
      const stepRunning = run.steps.some((step) => step.status === 'running');
      return (
        <div className="pt-0.5">
          <StepList steps={run.steps} thinking={!stepRunning} />
          <div className="mt-1 flex flex-col gap-2" aria-hidden>
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[78%]" />
            <Skeleton className="h-3 w-[54%]" />
          </div>
        </div>
      );
    }

    case 'completed':
      return (
        <div>
          {run.steps.length > 0 && <StepSummary run={run} />}
          <Answer markdown={run.run?.answer ?? ''} />
          <Sources records={parseRecords(run.run?.records ?? null)} />
        </div>
      );

    case 'failed':
      return (
        <div className="flex flex-col gap-3">
          {run.steps.length > 0 && <StepList steps={run.steps} />}
          <Alert tone="danger">
            <CircleAlert />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {run.started
                  ? "Scout couldn't finish this request."
                  : "Scout couldn't start this request."}
              </p>
              {run.error && <p className="mt-0.5 text-muted-foreground">{run.error}</p>}
              <RetryButton onRetry={onRetry} />
            </div>
          </Alert>
        </div>
      );

    case 'interrupted':
      return (
        <div className="flex flex-col gap-3">
          {run.steps.length > 0 && <StepList steps={run.steps} />}
          <Alert tone="warning">
            <TriangleAlert />
            <div className="min-w-0 flex-1">
              <p className="font-medium">This run stopped before it finished.</p>
              <p className="mt-0.5 text-muted-foreground">
                Scout stops when the session that started a run ends, for example after a sign-out.
              </p>
              <RetryButton onRetry={onRetry} />
            </div>
          </Alert>
        </div>
      );
  }
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2.5">
      <RotateCcw />
      Try again
    </Button>
  );
}

/** "Used 5 steps · read 11 rows · wrote 2 rows · 6.2 s", expandable to the full timeline. */
function StepSummary({ run }: { run: RunView }) {
  const denied = run.steps.filter((step) => step.status === 'denied').length;
  // A step Appwrite refused stays visible: it explains the answer.
  const [open, setOpen] = useState(denied > 0);
  const stats = run.run;

  const parts = [`Used ${plural(run.steps.length, 'step')}`];
  if (stats) {
    parts.push(`read ${plural(stats.readCount, 'row')}`);
    if (stats.writeCount > 0) parts.push(`wrote ${plural(stats.writeCount, 'row')}`);
    if (stats.durationMs) parts.push(`${(stats.durationMs / 1000).toFixed(1)} s`);
  }

  return (
    <div className="mb-2.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="-ml-1 flex h-6 items-center gap-1 rounded-md px-1 text-xs text-subtle outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')}
        />
        <span className="tabular">{parts.join(' · ')}</span>
        {denied > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-warning">
            <Lock className="size-3" />
            {denied} not allowed
          </span>
        )}
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-2.5">
            <StepList steps={run.steps} />
          </div>
        </div>
      </div>
    </div>
  );
}
