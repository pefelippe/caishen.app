import { MessageCircleIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { HEADER_ICON } from '../lib/header';
import { useI18n } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';
import { Logo } from './Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu, type ProfileUser } from './ProfileMenu';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/** The Agente: opens or closes the chat panel (⌘K / Ctrl+K does too). Not on its own page, nor on
 * a phone, where it sits in the middle of the tabs (`MobileNav`). */
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
      title={`${t('header.chat')} (${isMac ? '⌘K' : 'Ctrl K'})`}
      variant="ghost"
    >
      <MessageCircleIcon className="size-[18px]" />
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
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 pr-3 pl-4 text-header-foreground md:pr-4 md:pl-0 print:hidden">
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
        <AgentButton />
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
