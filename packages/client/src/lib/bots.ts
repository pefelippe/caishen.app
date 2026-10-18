import type { BotKey } from '@zapbots/graphql/client';
import { CoinsIcon, type LucideIcon } from 'lucide-react';

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
    icon: CoinsIcon,
    key: 'FINANCE',
    name: 'Caishen',
    path: '/caishen',
  },
];

/**
 * The tabs of each Bot's page: what its field needs (reports, sheets, Jobs…). The chat is not a
 * tab; it opens from the page header or the floating button.
 */
export const BOT_SECTIONS: Record<BotKey, { label: string; to: string }[]> = {
  FINANCE: [
    { label: 'Finanças', to: '/caishen/financas' },
    { label: 'Trabalhos', to: '/caishen/trabalhos' },
  ],
};

export const teamBot = (key: BotKey) => TEAM.find(bot => bot.key === key)!;

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
