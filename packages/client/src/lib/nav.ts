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
  icon: LucideIcon;
  label: string;
  to: string;
}

export interface NavGroup {
  id: string;
  /** Groups without a label sit at the top, always open. */
  label?: string;
  items: NavItem[];
}

/**
 * Every screen of the app, by category, as the menu on the left lists them: the main screens, then
 * each working Bot's pages (from `BOT_SECTIONS`), then the account's.
 */
export function useNavGroups(): NavGroup[] {
  const { t } = useI18n();
  return [
    {
      id: 'main',
      items: [
        { icon: HouseIcon, label: t('nav.home'), to: '/' },
        { icon: MessageSquareIcon, label: t('nav.agent'), to: '/chat' },
        { icon: WorkflowIcon, label: t('rail.workflows'), to: '/workflows' },
        { icon: FileTextIcon, label: t('rail.documents'), to: '/documents' },
      ],
    },
    ...TEAM.map(bot => ({
      id: bot.key,
      items: BOT_SECTIONS[bot.key].flatMap(group => group.links),
      label: bot.name,
    })),
    {
      id: 'account',
      items: [
        { icon: UserIcon, label: t('menu.profile'), to: '/profile' },
        { icon: CreditCardIcon, label: t('rail.plan'), to: '/plan' },
        { icon: BuildingIcon, label: t('rail.organization'), to: '/organization' },
        { icon: PlugIcon, label: t('rail.integrations'), to: '/integrations' },
      ],
      label: t('nav.account'),
    },
  ];
}

/**
 * The item for the open screen: the longest one that matches, so /caishen/obligations/x lights
 * Obrigações and `/` only lights on the home itself.
 */
export function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  return [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find(item =>
      item.to === '/'
        ? pathname === '/'
        : pathname === item.to || pathname.startsWith(`${item.to}/`)
    );
}
