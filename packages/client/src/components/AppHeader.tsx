import { SearchIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';
import { Kbd } from '@zapbots/ui/blocks/kbd';
import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { useSidebar } from '@zapbots/ui/components/sidebar';
import { cn } from '@zapbots/ui/lib/utils';

import { HEADER_ICON } from '../lib/header';
import { useI18n } from '../lib/i18n';
import { isMac, shortcut } from '../lib/shortcuts';
import { useChatPanel } from './ChatPanel';
import { useOpenCommandMenu } from './CommandMenu';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu, type ProfileUser } from './ProfileMenu';

/** Opens the command menu, with its shortcut beside it (⌘K on a Mac, Ctrl K elsewhere). Not on a
 * phone, which has no keyboard shortcuts. */
function SearchButton() {
  const openCommands = useOpenCommandMenu();
  const { t } = useI18n();
  return (
    <Button
      aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      className={cn(
        HEADER_ICON,
        'hidden w-auto gap-2 border border-white/15 pr-1.5 pl-3 text-header-foreground/80 hover:border-white/30 md:inline-flex'
      )}
      onClick={openCommands}
      title={`${t('command.title')} (${shortcut('K')})`}
      variant="ghost"
    >
      <SearchIcon className="size-4" />
      <span>{t('command.search')}</span>
      <Kbd className="border-white/15 bg-white/10 text-header-foreground/80">{shortcut('K')}</Kbd>
    </Button>
  );
}

/** The Agente: opens or closes the chat panel. Not on its own page, nor on a phone, where it sits
 * in the middle of the tabs (`MobileNav`). */
function AgentButton() {
  const { pathname } = useLocation();
  const { open, toggle } = useChatPanel();
  const { t } = useI18n();
  if (pathname === '/chat') return null;

  return (
    <Button
      aria-expanded={open}
      aria-label={t('chat.toggle')}
      className={cn(
        HEADER_ICON,
        'hidden gap-1.5 border border-white/25 hover:border-white/40 md:inline-flex md:w-auto md:pr-4 md:pl-3'
      )}
      onClick={toggle}
      variant="ghost"
    >
      <AgentIcon className="size-[18px]" />
      <span>{t('header.chat')}</span>
    </Button>
  );
}

/**
 * The navy bar across the top. On the left the Caishen's mark, as wide as the menu under it (only
 * the symbol over its icons when collapsed; on a phone, with its name). On
 * the right the Agente, the Alerts and the avatar, whose menu holds the account's screens, the
 * language, the theme and signing out.
 */
export function AppHeader({ user }: { user: ProfileUser }) {
  const { state } = useSidebar();
  const { t } = useI18n();
  const collapsed = state === 'collapsed';

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 pt-[env(safe-area-inset-top)] pr-3 pl-4 text-header-foreground md:pr-4 md:pl-0 print:hidden">
      {/* Over the menu: its left edge on the menu's icons, its width the menu's. */}
      <Link
        aria-label={t('rail.caishen')}
        className={cn(
          'flex shrink-0 items-center gap-2.5 transition-[width,padding] duration-300 ease-(--ease-sidebar)',
          collapsed
            ? 'md:w-(--sidebar-width-icon) md:pl-[1.625rem]'
            : 'md:w-(--sidebar-width) md:pl-[2.375rem]'
        )}
        to="/"
      >
        <Logo size={24} />
        <span className={cn('text-base font-semibold tracking-tight', collapsed && 'md:hidden')}>
          Caishen
        </span>
      </Link>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <SearchButton />
        <AgentButton />
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
