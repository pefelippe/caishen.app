import { SearchIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';
import { Kbd } from '@zapbots/ui/blocks/kbd';
import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
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
        'hidden w-auto gap-2 border pr-1.5 pl-3 text-muted-foreground md:inline-flex'
      )}
      onClick={openCommands}
      title={`${t('command.title')} (${shortcut('K')})`}
      variant="ghost"
    >
      <SearchIcon className="size-4" />
      <span>{t('command.search')}</span>
      <Kbd>{shortcut('K')}</Kbd>
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
      className={cn(HEADER_ICON, 'hidden gap-1.5 border md:inline-flex md:w-auto md:pr-4 md:pl-3')}
      onClick={toggle}
      variant="ghost"
    >
      <AgentIcon className="size-[18px]" />
      <span>{t('header.chat')}</span>
    </Button>
  );
}

/**
 * The white bar over the screen, after Mercado Pago's: on the right Buscar, the Agente, the Alerts
 * and the avatar, whose menu holds the account's screens, the language, the theme and signing out.
 * The mark sits atop the menu (`AppSidebar`); only a phone, with no menu, shows it here.
 */
export function AppHeader({ user }: { user: ProfileUser }) {
  const { t } = useI18n();

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 bg-background pt-[env(safe-area-inset-top)] pr-3 pl-4 text-foreground md:pr-6 print:hidden">
      <Link aria-label={t('rail.caishen')} className="flex items-center gap-2.5 md:hidden" to="/">
        <Logo size={24} />
        <span className="text-base font-semibold tracking-tight">Caishen</span>
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
