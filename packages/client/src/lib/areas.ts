import type { BuddyArea } from '@mny/graphql/client';

/** Where each Buddy lives. `GENERAL` is the Chat page; the others are the Areas. */
export const AREAS: Record<BuddyArea, { label: string; path: string }> = {
  FINANCE: { label: 'Finanças', path: '/financas' },
  FITNESS: { label: 'Fitness', path: '/fitness' },
  GENERAL: { label: 'Chat', path: '/chat' },
  NOTES: { label: 'Anotações', path: '/anotacoes' },
  WORK: { label: 'Trabalho', path: '/trabalho' },
};

export const AREA_ORDER: BuddyArea[] = ['FINANCE', 'NOTES', 'WORK', 'FITNESS'];

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
