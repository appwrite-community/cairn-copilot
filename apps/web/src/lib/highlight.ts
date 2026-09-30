import { useSyncExternalStore } from 'react';

/**
 * Rows that just changed get a short accent flash: Realtime changes made by
 * someone else or by Scout, and records opened from Scout's Sources.
 */
const tokens = new Map<string, number>();
const quiet = new Map<string, number>();
const listeners = new Set<() => void>();
let counter = 0;

const QUIET_MS = 4000;

export function flash(rowId: string) {
  if ((quiet.get(rowId) ?? 0) > Date.now()) return;
  tokens.set(rowId, ++counter);
  listeners.forEach((listener) => listener());
}

/** Skips the flash for a change the user just made in this tab, such as ticking a task. */
export function quietFlash(rowId: string) {
  quiet.set(rowId, Date.now() + QUIET_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A number that changes each time the row flashes; 0 when it never did. */
export function useFlash(rowId: string) {
  return useSyncExternalStore(subscribe, () => tokens.get(rowId) ?? 0);
}
