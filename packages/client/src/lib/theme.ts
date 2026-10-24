import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/** What the User picked in the avatar's menu; `system` follows the device. */
export type ThemeChoice = 'dark' | 'light' | 'system';

const KEY = 'zapbots.theme';
const listeners = new Set<() => void>();

function stored(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'dark' || value === 'light' || value === 'system') return value;
  } catch {
    // Without storage, light.
  }
  return 'light';
}

let current: ThemeChoice = stored();

/** The theme picked in this browser, light until the User picks another (index.html applies it
 * before the first paint). */
export function useThemeChoice(): {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
} {
  const choice = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current
  );
  const setChoice = useCallback((next: ThemeChoice) => {
    current = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // It still changes for this visit.
    }
    for (const listener of listeners) listener();
  }, []);
  return { choice, setChoice };
}

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

/**
 * Paints the app in its theme while `on` (the signed-in frame); the landing page and the sign-in
 * stay light.
 */
export function useAppliedTheme(on: boolean) {
  const { choice } = useThemeChoice();
  const [systemDark, setSystemDark] = useState(() => Boolean(darkQuery()?.matches));

  useEffect(() => {
    const query = darkQuery();
    if (!query) return;
    const change = () => setSystemDark(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  const dark = choice === 'dark' || (choice === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', on && dark);
  }, [on, dark]);
}
