import {
  FileTextIcon,
  HouseIcon,
  MessageSquareIcon,
  PlugIcon,
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
 * each working Bot's pages (from `BOT_SECTIONS`). The account's screens live in the `ProfileMenu`.
 */
export function useNavGroups(): NavGroup[] {
  const { t } = useI18n();
  return [
    {
      id: 'main',
      items: [
        { icon: HouseIcon, label: t('nav.home'), to: '/' },
        { icon: MessageSquareIcon, label: t('nav.agent'), to: '/chat' },
        { icon: FileTextIcon, label: t('rail.documents'), to: '/documents' },
        { icon: PlugIcon, label: t('integrations.title'), to: '/integrations' },
      ],
    },
    ...TEAM.map(bot => ({
      id: bot.key,
      items: BOT_SECTIONS[bot.key].flatMap(group => group.links),
      label: bot.name,
    })),
  ];
}

/**
 * The item for the open screen: the longest one that matches, so /caishen/finances lights
 * Financeiro and `/` only lights on the home itself.
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
