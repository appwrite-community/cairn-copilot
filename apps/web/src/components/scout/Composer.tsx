import { ArrowUp } from 'lucide-react';
import { useLayoutEffect, type KeyboardEvent } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { MAX_PROMPT_LENGTH } from '@/lib/scout';
import { cn } from '@/lib/utils';
import { useScout } from './ScoutProvider';

const MAX_LINES = 6;
const LINE_HEIGHT = 22;

export function Composer({ onEscape }: { onEscape?: () => void }) {
  const { draft, setDraft, ask, busy, composerRef } = useScout();
  const prompt = draft.trim();
  const tooLong = draft.length > MAX_PROMPT_LENGTH;
  const canSend = prompt.length > 0 && !tooLong && !busy;

  // Grow with the text, up to six lines.
  useLayoutEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_LINES * LINE_HEIGHT + 16)}px`;
  }, [draft, composerRef]);

  function send() {
    if (canSend) ask(prompt);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    } else if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-sidebar px-4 pb-3 pt-3">
      <div className="rounded-xl border border-border-strong bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask about an account, a deal, or your tasks"
          aria-label="Message Scout"
          className="block max-h-[148px] w-full resize-none bg-transparent px-3 pt-2.5 text-[14px] leading-[22px] text-foreground outline-none placeholder:text-subtle"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <span
            className={cn(
              'pl-1 text-xs tabular',
              tooLong ? 'text-danger' : 'text-subtle',
              draft.length <= 1800 && 'invisible',
            )}
            aria-live="polite"
          >
            {draft.length} / {MAX_PROMPT_LENGTH}
          </span>
          <Tooltip content={busy ? 'Scout is still working' : 'Send'} side="top">
            <span className="inline-flex">
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                aria-label="Send"
                className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground outline-none transition-[background-color,opacity] duration-150 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle"
              >
                <ArrowUp className="size-4" strokeWidth={2.25} />
              </button>
            </span>
          </Tooltip>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] leading-4 text-subtle">
        Scout can make mistakes. It never sees records you can't open.
      </p>
    </div>
  );
}
