import type { BotKey } from '@zapbots/graphql/client';
import {
  BuildingIcon,
  CreditCardIcon,
  FileTextIcon,
  HouseIcon,
  MessageSquareIcon,
  PlugIcon,
  UserIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react';

import { BOT_SECTIONS, TEAM } from './bots';
import { useI18n } from './i18n';

export interface NavItem {
  /** Shown greyed out with "Em breve", without a link. */
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  to: string;
}

export interface Nav {
  /** The screens of the whole app, at the top of the menu. */
  main: NavItem[];
  /** Each working Bot's pages (from `BOT_SECTIONS`), shown for the Bot picked in the switcher. */
  bots: Record<BotKey, NavItem[]>;
  /** The account's screens, at the foot of the menu. */
  account: NavItem[];
}

/**
 * Every screen of the app as the menu on the left lists them: the main screens, the pages of the
 * Bot picked in its switcher, and the account's screens at the foot.
 */
export function useNav(): Nav {
  const { t } = useI18n();
  return {
    account: [
      { icon: BuildingIcon, label: t('rail.organization'), to: '/organization' },
      { icon: PlugIcon, label: t('integrations.title'), to: '/integrations' },
      { icon: CreditCardIcon, label: t('rail.plan'), to: '/plan' },
      { icon: UserIcon, label: t('menu.profile'), to: '/profile' },
    ],
    bots: Object.fromEntries(
      TEAM.map(bot => [bot.key, BOT_SECTIONS[bot.key].flatMap(group => group.links)])
    ) as Record<BotKey, NavItem[]>,
    main: [
      { icon: HouseIcon, label: t('nav.home'), to: '/' },
      { icon: MessageSquareIcon, label: t('nav.agent'), to: '/chat' },
      // Workflows are off until they work end to end (App.tsx sends /workflows home).
      { disabled: true, icon: WorkflowIcon, label: t('rail.workflows'), to: '/workflows' },
      { icon: FileTextIcon, label: t('rail.documents'), to: '/documents' },
    ],
  };
}

/**
 * The item for the open screen: the longest one that matches, so /caishen/entries/fixed lights
 * Lançamentos and `/` only lights on the home itself.
 */
export function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  return [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find(
      item =>
        !item.disabled &&
        (item.to === '/'
          ? pathname === '/'
          : pathname === item.to || pathname.startsWith(`${item.to}/`))
    );
}
