import { useEffect } from 'react';

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The modifier key label for shortcuts: ⌘ on Apple devices, Ctrl elsewhere. */
export const modKey = isMac ? '⌘' : 'Ctrl';

/** Runs the handler for ⌘+key (Ctrl+key outside Apple devices). */
export function useModShortcut(key: string, handler: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== key) return;
      event.preventDefault();
      handler();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler]);
}
