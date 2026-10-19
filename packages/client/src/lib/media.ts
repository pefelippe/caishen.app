import { useSyncExternalStore } from 'react';

const DESKTOP = '(min-width: 768px)';

/** Whether the screen is wide enough for a side panel beside the page (Tailwind's `md`). */
export function useDesktop(): boolean {
  return useSyncExternalStore(
    notify => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(DESKTOP).matches
  );
}
