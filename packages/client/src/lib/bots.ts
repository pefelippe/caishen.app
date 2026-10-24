import type { BotKey } from '@zapbots/graphql/client';
import type { LucideIcon } from 'lucide-react';

import { CaishenMark } from '../components/Logo';

/** A Bot on the team as the app shows it. */
export interface TeamBot {
  description: string;
  /** What the Bot works on. */
  field: string;
  icon: LucideIcon;
  key: BotKey;
  name: string;
  /** The Bot's own address in the app, e.g. `/caishen`. */
  path: string;
}

export const TEAM: TeamBot[] = [
  {
    description:
      'Acompanha suas Obrigações de crédito, explica juros e parcelas e devolve análises prontas.',
    field: 'Finanças',
    icon: CaishenMark,
    key: 'FINANCE',
    name: 'Caishen',
    path: '/caishen',
  },
];

/**
 * Bots still being built, shown under "Em breve" on the landing page with the sections they will
 * have. They are not in `TEAM` and have no `BotKey` until they work.
 */
export interface UpcomingBot {
  description: string;
  field: string;
  icon: LucideIcon;
  key: string;
  name: string;
  sections: { icon: LucideIcon; label: string }[];
}

export const UPCOMING_BOTS: UpcomingBot[] = [];

export const teamBot = (key: BotKey) => TEAM.find(bot => bot.key === key)!;

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
