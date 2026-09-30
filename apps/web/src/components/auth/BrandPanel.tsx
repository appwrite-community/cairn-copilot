import { Check, Lock, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/** The left half of the sign-in page: the pitch and a few records drawn in Cairn's UI. */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute inset-0 [background-image:radial-gradient(#2a2a32_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_40%_60%,black_30%,transparent_78%)]"
      />
      <div className="relative flex flex-1 flex-col px-12 py-10 xl:px-16">
        <Logo />

        <div className="mt-auto max-w-[480px]">
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-balance">
            The account workspace for B2B teams
            <span className="text-subtle">, with an assistant that only knows what you know.</span>
          </h1>
        </div>

        <div aria-hidden className="relative mb-auto mt-10 h-[330px] max-w-[500px] select-none">
          <div className="absolute left-0 top-0 w-[330px] rounded-xl border border-border bg-surface p-3.5 shadow-overlay">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-raised text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border-strong">
                AF
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Alder Freight</div>
                <div className="text-xs text-subtle">Logistics · Mid-market</div>
              </div>
              <Badge tone="warning">Watch</Badge>
            </div>
            <div className="mt-3 flex gap-5 border-t border-border pt-3 text-xs">
              <div>
                <div className="text-subtle">ARR</div>
                <div className="mt-0.5 font-medium tabular">$72,000</div>
              </div>
              <div>
                <div className="text-subtle">Owner</div>
                <div className="mt-0.5 font-medium">Maya Chen</div>
              </div>
              <div>
                <div className="text-subtle">Notes</div>
                <div className="mt-0.5 font-medium tabular">5 you can read</div>
              </div>
            </div>
          </div>

          <div className="absolute left-[150px] top-[132px] w-[340px] rounded-xl border border-border-strong bg-surface p-3.5 shadow-overlay">
            <div className="flex items-center gap-2">
              <ScoutMark size={20} />
              <span className="text-sm font-medium">Scout</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-subtle">
                <ShieldCheck className="size-3 text-primary" />
                Acting as Maya Chen
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-xs">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-success" />
                <span className="text-muted-foreground">Reading notes on Alder Freight</span>
                <span className="ml-auto text-subtle tabular">5 notes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-success" />
                <span className="text-muted-foreground">Listing deals on Alder Freight</span>
                <span className="ml-auto text-subtle tabular">1 deal</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="size-3.5 text-violet" />
                <span className="h-2 flex-1 rounded-full bg-[repeating-linear-gradient(135deg,rgb(183_156_255/0.28)_0_4px,transparent_4px_8px)]" />
                <span className="text-subtle">Leadership only</span>
              </li>
            </ul>
          </div>

          <div className="absolute left-[40px] top-[282px] flex w-[300px] items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-2 text-xs shadow-overlay">
            <Avatar name="Maya Chen" size="xs" />
            <span className="truncate text-muted-foreground">Ana prefers email over calls.</span>
            <Badge className="ml-auto">
              <Lock />
              Only you
            </Badge>
          </div>
        </div>

        <p className="text-xs text-subtle">Scout answers with your permissions, never more.</p>
      </div>
    </aside>
  );
}
