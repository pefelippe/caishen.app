import type { BotKey } from '@zapbots/graphql/client';

/** Where each Bot lives in the app, and the name of its main screen. */
export const BOTS: Record<BotKey, { home: string; path: string }> = {
  FINANCE: { home: 'Finanças', path: '/caishen' },
};

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
