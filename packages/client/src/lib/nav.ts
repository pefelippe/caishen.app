import {
  BotIcon,
  CalculatorIcon,
  FileTextIcon,
  FlagIcon,
  GaugeIcon,
  HouseIcon,
  LandmarkIcon,
  MessageSquareIcon,
  PieChartIcon,
  PlugIcon,
  PercentIcon,
  RepeatIcon,
  SheetIcon,
  TvIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

import { useI18n } from './i18n';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  /** Other paths that belong to this item, e.g. an Operation's page to Dívidas. */
  owns?: string[];
  /** Shown with an "Em breve" pill, without a link. */
  soon?: boolean;
  to: string;
}

/** A titled part of the menu that opens and closes, like the hPanel's. */
export interface NavGroup {
  items: NavItem[];
  key: string;
  label: string;
}

export interface Nav {
  /** The screens used most, always at the top of the menu. */
  main: NavItem[];
  groups: NavGroup[];
}

/**
 * Every screen of the app as the menu on the left lists them, after the hPanel: the main ones on
 * top, then Finanças, Planejamento and Automação. The account's screens are in the avatar's menu.
 */
export function useNav(): Nav {
  const { t } = useI18n();
  return {
    groups: [
      {
        items: [
          { icon: SheetIcon, label: t('nav.entries'), to: '/caishen/entries' },
          { icon: WalletIcon, label: t('nav.income'), to: '/caishen/income' },
          { icon: RepeatIcon, label: t('nav.fixed'), to: '/caishen/fixed' },
          { icon: TvIcon, label: t('nav.subscriptions'), to: '/caishen/subscriptions' },
          {
            icon: LandmarkIcon,
            label: t('nav.debts'),
            owns: ['/caishen/operations'],
            to: '/caishen/debts',
          },
          { icon: PercentIcon, label: t('nav.taxes'), to: '/caishen/taxes' },
          { icon: PieChartIcon, label: t('nav.budget'), to: '/caishen/budget' },
        ],
        key: 'finances',
        label: t('nav.finances'),
      },
      {
        items: [
          { icon: FlagIcon, label: t('nav.payoff'), to: '/caishen/payoff' },
          { icon: GaugeIcon, label: t('nav.credit'), to: '/caishen/credit' },
          {
            icon: CalculatorIcon,
            label: t('nav.calculators'),
            to: '/caishen/calculators',
          },
        ],
        key: 'planning',
        label: t('nav.planning'),
      },
      {
        items: [
          { icon: BotIcon, label: t('nav.workflows'), to: '/workflows' },
          { icon: FileTextIcon, label: t('nav.documents'), to: '/documents' },
        ],
        key: 'automation',
        label: t('nav.automation'),
      },
    ],
    main: [
      { icon: HouseIcon, label: t('nav.home'), to: '/' },
      { icon: MessageSquareIcon, label: t('nav.agent'), to: '/chat' },
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

/** Screens with a column of their own beside the menu (the Agente's Conversations): there the menu
 * shrinks to a rail of icons with their names under them, as the hPanel does. */
const RAIL_PATHS = ['/chat'];

export function isRailPath(pathname: string): boolean {
  return RAIL_PATHS.includes(pathname);
}
