import { FileTextIcon, HouseIcon, MessageSquareIcon, BotIcon, type LucideIcon } from 'lucide-react';

import { INTEGRATION_GROUPS } from '../components/ConnectionsSettings';
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
 * each working Bot's pages (from `BOT_SECTIONS`), then Integrações: the Models and each kind of tool. The account's screens live in the `ProfileMenu`.
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
      ],
    },
    ...TEAM.map(bot => ({
      id: bot.key,
      items: BOT_SECTIONS[bot.key].flatMap(group => group.links),
      label: bot.name,
    })),
    {
      id: 'integrations',
      items: [
        { icon: BotIcon, label: t('rail.models'), to: '/integrations/models' },
        ...INTEGRATION_GROUPS.map(group => ({
          icon: group.icon,
          label: group.short ?? group.title,
          to: `/integrations/${group.id}`,
        })),
      ],
      label: t('integrations.title'),
    },
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
