import type { Stage } from '@/lib/types';
import { cn } from '@/lib/utils';

/** A small progress circle per stage: empty, a third, two thirds, won, lost. */
export function StageIcon({ stage, className }: { stage: Stage; className?: string }) {
  const common = cn('size-3.5 shrink-0', className);
  if (stage === 'closed_won') {
    return (
      <svg viewBox="0 0 14 14" className={cn(common, 'text-success')} aria-hidden>
        <circle cx="7" cy="7" r="6" fill="currentColor" />
        <path
          d="M4.3 7.2 6.2 9l3.5-3.9"
          fill="none"
          stroke="#0b0b0d"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (stage === 'closed_lost') {
    return (
      <svg viewBox="0 0 14 14" className={cn(common, 'text-subtle')} aria-hidden>
        <circle cx="7" cy="7" r="5.9" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="m5 5 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  const share = stage === 'discovery' ? 0 : stage === 'proposal' ? 1 / 3 : 2 / 3;
  const angle = share * 2 * Math.PI;
  const x = 7 + 3.6 * Math.sin(angle);
  const y = 7 - 3.6 * Math.cos(angle);
  return (
    <svg viewBox="0 0 14 14" className={cn(common, 'text-primary')} aria-hidden>
      <circle
        cx="7"
        cy="7"
        r="5.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray={stage === 'discovery' ? '2.2 1.9' : undefined}
      />
      {share > 0 && (
        <path
          d={`M7 7V3.4A3.6 3.6 0 ${share > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`}
          fill="currentColor"
        />
      )}
    </svg>
  );
}
