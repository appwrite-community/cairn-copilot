import {
  ArrowRightLeft,
  Building2,
  CalendarPlus,
  Check,
  CircleAlert,
  FileText,
  Handshake,
  LayoutList,
  ListChecks,
  LoaderCircle,
  Lock,
  PenLine,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import type { Step } from '@/lib/types';
import { cn } from '@/lib/utils';

const TOOL_ICONS: Record<string, LucideIcon> = {
  search_records: Search,
  list_accounts: LayoutList,
  get_account: Building2,
  list_deals: Handshake,
  list_notes: FileText,
  list_tasks: ListChecks,
  create_note: PenLine,
  create_task: CalendarPlus,
  update_deal: ArrowRightLeft,
};

/** When this tab first saw each running step, so its timer starts at zero here. */
const firstSeen = new Map<string, number>();

/** Scout's tool calls, in order, as a vertical timeline. */
export function StepList({ steps, thinking }: { steps: Step[]; thinking?: boolean }) {
  return (
    <ol className="relative flex flex-col">
      {steps.map((step, index) => (
        <StepRow key={step.$id} step={step} last={index === steps.length - 1 && !thinking} />
      ))}
      {thinking && (
        <li className="flex items-center gap-3 animate-enter">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-dashed border-border-strong">
            <Sparkles className="size-3.5 text-subtle" />
          </span>
          <span className="text-shimmer text-[13px]">
            {steps.length ? 'Thinking' : 'Reading your question'}
          </span>
        </li>
      )}
    </ol>
  );
}

function StepRow({ step, last }: { step: Step; last: boolean }) {
  const Icon = TOOL_ICONS[step.tool] ?? Sparkles;
  const denied = step.status === 'denied';
  return (
    <li className="relative flex gap-3 pb-3 animate-enter last:pb-3">
      {!last && (
        <span aria-hidden className="absolute bottom-0 left-[13.5px] top-7 w-px bg-border-strong" />
      )}
      <Tooltip content={<span className="font-mono">{step.tool}</span>} side="left">
        <span
          className={cn(
            'relative grid size-7 shrink-0 place-items-center rounded-lg border',
            denied
              ? 'border-warning/30 bg-warning/10 text-warning'
              : 'border-border-strong bg-raised text-muted-foreground',
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </Tooltip>
      <div className="min-w-0 flex-1 pt-[3px]">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[13px] leading-5 text-foreground">{step.label}</span>
          <StepStatus step={step} />
        </div>
        {step.detail && (
          <p className={cn('mt-0.5 text-xs', denied ? 'text-warning/90' : 'text-subtle')}>
            {step.detail}
          </p>
        )}
      </div>
    </li>
  );
}

function StepStatus({ step }: { step: Step }) {
  const seconds = useStepSeconds(step);
  const time = <span className="w-9 text-right text-xs tabular text-subtle">{seconds}</span>;

  if (step.status === 'running') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
        <LoaderCircle className="size-3.5 animate-spin text-primary" aria-label="Running" />
        {time}
      </span>
    );
  }
  if (step.status === 'denied') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
        <span className="flex items-center gap-1 text-xs font-medium text-warning">
          <Lock className="size-3" />
          Not allowed
        </span>
        {time}
      </span>
    );
  }
  if (step.status === 'error') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
        <CircleAlert className="size-3.5 text-danger" aria-label="Error" />
        {time}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
      <Check className="size-3.5 text-success" aria-label="Done" />
      {time}
    </span>
  );
}

/** Seconds the step took, or has been running, formatted as "1.2s". */
function useStepSeconds(step: Step) {
  const running = step.status === 'running';
  const [now, setNow] = useState(() => Date.now());

  if (running && !firstSeen.has(step.$id)) firstSeen.set(step.$id, Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [running]);

  const ms = running
    ? now - (firstSeen.get(step.$id) ?? now)
    : new Date(step.$updatedAt).getTime() - new Date(step.$createdAt).getTime();
  return `${(Math.max(ms, 0) / 1000).toFixed(1)}s`;
}
