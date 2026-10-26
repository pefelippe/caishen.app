import {
  BotIcon,
  CalculatorIcon,
  CreditCardIcon,
  FileTextIcon,
  FlagIcon,
  HouseIcon,
  PlugIcon,
  RepeatIcon,
  SettingsIcon,
  SheetIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';

import { useI18n } from './i18n';

/**
 * Documentos only in development: imported files and Attachments should land there, but there is
 * nowhere to store them yet. In production its menu item is "Em breve" and its paths go home.
 */
export const DOCUMENTS_ENABLED = import.meta.env.DEV;

export interface NavItem {
  icon: LucideIcon;
  label: string;
  /** Other paths that belong to this item, e.g. an Operation's page to Dívidas. */
  owns?: string[];
  /** Shown with an "Em breve" pill, without a link. */
  soon?: boolean;
  to: string;
}

/** A titled part of the menu that opens and closes. */
export interface NavGroup {
  items: NavItem[];
  key: string;
  label: string;
}

export interface Nav {
  /** The account's screens: in the avatar's menu, not on the left; the phone's Mais lists them. */
  account: NavItem[];
  /** The screens used most, always at the top of the menu. */
  main: NavItem[];
  groups: NavGroup[];
}

/**
 * Every screen of the app as the menu on the left lists them: the main ones on top (Página inicial,
 * Agente, Documentos, Workflows, Integrações), then Finanças. The account's (Perfil, Plano,
 * Configurações) are in the avatar's menu instead.
 */
export function useNav(): Nav {
  const { t } = useI18n();
  return {
    groups: [
      {
        items: [
          { icon: SheetIcon, label: t('nav.entries'), to: '/caishen/entries' },
          { icon: WalletIcon, label: t('nav.income'), to: '/caishen/income' },
          {
            icon: RepeatIcon,
            label: t('nav.fixed'),
            owns: ['/caishen/operations'],
            to: '/caishen/fixed',
          },
          { icon: FlagIcon, label: t('nav.payoff'), to: '/caishen/payoff' },
          { icon: CalculatorIcon, label: t('nav.calculators'), to: '/caishen/calculators' },
        ],
        key: 'finances',
        label: t('nav.finances'),
      },
    ],
    account: [
      { icon: UserIcon, label: t('nav.profile'), to: '/profile' },
      { icon: CreditCardIcon, label: t('rail.plan'), to: '/plan' },
      { icon: SettingsIcon, label: t('nav.settings'), to: '/settings' },
    ],
    main: [
      { icon: HouseIcon, label: t('nav.home'), to: '/' },
      { icon: AgentIcon, label: t('nav.agent'), to: '/chat' },
      {
        icon: FileTextIcon,
        label: t('nav.documents'),
        soon: !DOCUMENTS_ENABLED,
        to: '/documents',
      },
      { icon: BotIcon, label: t('nav.workflows'), to: '/workflows' },
      { icon: PlugIcon, label: t('nav.integrations'), to: '/integrations' },
    ],
  };
}

/**
 * The item for the open screen: the longest path that matches, its own or one it owns, so an
 * Operation's page lights Dívidas and `/` only lights on the home itself.
 */
export function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  const matches = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
  let best: { item: NavItem; length: number } | undefined;
  for (const item of items) {
    if (item.soon) continue;
    for (const path of [item.to, ...(item.owns ?? [])]) {
      if (matches(path) && (!best || path.length > best.length))
        best = { item, length: path.length };
    }
  }
  return best?.item;
}

/** Screens with a column of their own beside the menu (the Agente's Conversations): opening one
 * shrinks the menu to its icons. */
const RAIL_PATHS = ['/chat'];

export function isRailPath(pathname: string): boolean {
  return RAIL_PATHS.includes(pathname);
}
