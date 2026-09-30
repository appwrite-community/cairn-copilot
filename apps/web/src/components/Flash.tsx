import { useFlash } from '@/lib/highlight';

/**
 * Overlay that plays the accent flash when its row changes. Place it inside
 * an element with `relative` positioning and rounded corners.
 */
export function Flash({ rowId }: { rowId: string }) {
  const token = useFlash(rowId);
  if (!token) return null;
  return (
    <span
      key={token}
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-flash rounded-[inherit]"
    />
  );
}
