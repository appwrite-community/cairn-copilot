import { CornerDownLeft } from 'lucide-react';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { inTeam, useSession } from '@/lib/session';
import { useScout } from './ScoutProvider';

const SALES_PROMPTS = [
  'Prep me for my call with Alder Freight',
  'Which of my deals close in the next 30 days?',
  'What pricing flexibility do we have on Alder Freight?',
  'Log a note on Sable Grid: Victor wants a proposal by Friday',
];

const SUCCESS_PROMPTS = [
  'Summarize recent notes on Meridian Health Partners',
  'Which accounts are at risk?',
  'What did Beth say about the bus fleet dashboard?',
  'Remind me to follow up with Ravi Menon tomorrow',
];

/** The empty panel: what Scout does, and a few prompts that fit the user's team. */
export function SuggestedPrompts() {
  const session = useSession();
  const { ask } = useScout();
  const prompts = inTeam(session, 'sales') ? SALES_PROMPTS : SUCCESS_PROMPTS;

  return (
    <div className="flex flex-1 flex-col justify-end px-5 pb-5 pt-10">
      <ScoutMark size={36} />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Ask about your accounts</h2>
      <p className="mt-1 max-w-[320px] text-sm text-muted-foreground">
        Scout searches, reads, and updates records with your access.
      </p>
      <ul className="mt-5 flex flex-col gap-1.5">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => ask(prompt)}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm text-muted-foreground outline-none transition-colors duration-150 hover:border-border-strong hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span className="flex-1">{prompt}</span>
              <CornerDownLeft className="size-3.5 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
