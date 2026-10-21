import type { BotKey } from '@zapbots/graphql/client';
import { CoinsIcon, LayoutGridIcon, WalletIcon, type LucideIcon } from 'lucide-react';

import type { SectionGroup } from '../components/SectionLayout';

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

/** The sections of each Bot's page, in its white menu: what its field needs. */
export const BOT_SECTIONS: Record<BotKey, SectionGroup[]> = {
  FINANCE: [
    {
      links: [{ icon: LayoutGridIcon, label: 'Visão geral', to: '/caishen/overview' }],
    },
    {
      links: [{ icon: WalletIcon, label: 'Financeiro', to: '/caishen/finances' }],
    },
  ],
};

export const teamBot = (key: BotKey) => TEAM.find(bot => bot.key === key)!;

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
