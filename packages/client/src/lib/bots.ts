import type { BotKey } from '@zapbots/graphql/client';
import {
  BriefcaseIcon,
  CalendarHeartIcon,
  FolderKanbanIcon,
  HeartPulseIcon,
  ListTodoIcon,
  ReceiptTextIcon,
  RepeatIcon,
  TimerIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react';

import { CaishenMark } from '../components/Logo';

export interface SectionLink {
  icon: LucideIcon;
  label: string;
  to: string;
}

/** A set of links in the menu on the left; groups without a label sit at the top. */
export interface SectionGroup {
  label?: string;
  links: SectionLink[];
}

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

/** The sections of each Bot's page, in its white menu: what its field needs. */
export const BOT_SECTIONS: Record<BotKey, SectionGroup[]> = {
  FINANCE: [
    {
      links: [{ icon: ReceiptTextIcon, label: 'Lançamentos', to: '/caishen/entries' }],
    },
  ],
};

/**
 * Bots still being built, shown disabled under "Em breve" in the menu's Bot switcher with the
 * sections they will have. They are not in `TEAM` and have no `BotKey` until they work.
 */
export interface UpcomingBot {
  description: string;
  field: string;
  icon: LucideIcon;
  key: string;
  name: string;
  sections: { icon: LucideIcon; label: string }[];
}

export const UPCOMING_BOTS: UpcomingBot[] = [
  {
    description: 'Hábitos, rotina, saúde e agenda do dia a dia.',
    field: 'Pessoal',
    icon: UserRoundIcon,
    key: 'personal',
    name: 'Caishen Personal',
    sections: [
      { icon: RepeatIcon, label: 'Rotina e hábitos' },
      { icon: HeartPulseIcon, label: 'Saúde e bem-estar' },
      { icon: CalendarHeartIcon, label: 'Agenda e lazer' },
    ],
  },
  {
    description: 'Tarefas, projetos e foco no trabalho.',
    field: 'Trabalho',
    icon: BriefcaseIcon,
    key: 'work',
    name: 'Caishen Work',
    sections: [
      { icon: ListTodoIcon, label: 'Minhas tarefas' },
      { icon: FolderKanbanIcon, label: 'Projetos' },
      { icon: TimerIcon, label: 'Foco e Pomodoro' },
    ],
  },
];

export const teamBot = (key: BotKey) => TEAM.find(bot => bot.key === key)!;

/** "2026-10-11" for the local day, the format the API's `Date` scalar uses. */
export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
