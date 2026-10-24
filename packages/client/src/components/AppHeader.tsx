import { MessageCircleIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { useI18n } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';
import { Logo } from './Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu, type ProfileUser } from './ProfileMenu';

/**
 * The navy bar across the top: the Caishen's mark on the left (and, on a phone, the menu button),
 * and on the right the chat (⌘K / Ctrl+K opens it too), the Alerts and the avatar that opens the
 * account (`ProfileMenu`).
 */
export function AppHeader({ user }: { user: ProfileUser }) {
  const { pathname } = useLocation();
  const { open, toggle } = useChatPanel();
  const { t } = useI18n();
  // The chat page already is the chat: no chat button there.
  const onChat = pathname === '/chat';

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 px-3 text-header-foreground md:px-4 print:hidden">
      <SidebarTrigger
        aria-label={t('header.menu')}
        className="size-9 rounded-full text-header-foreground hover:bg-white/10 hover:text-header-foreground md:hidden"
      />
      <Link
        aria-label={t('rail.caishen')}
        className="flex items-center gap-2.5 px-1 transition-[width] duration-300 ease-(--ease-sidebar) md:w-[calc(var(--sidebar-width)-1rem)]"
        to="/"
      >
        <Logo size={26} />
        <span className="hidden text-lg font-semibold tracking-tight sm:inline">Caishen</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
        {!onChat && (
          <Button
            aria-expanded={open}
            aria-label={t('chat.toggle')}
            className={cn(
              'size-9 gap-2 rounded-full border border-white/15 bg-white/8 text-header-foreground hover:bg-white/15 hover:text-header-foreground lg:w-auto lg:px-3.5',
              open && 'border-gold/60 bg-gold/15'
            )}
            onClick={toggle}
          >
            <MessageCircleIcon className="size-4" />
            <span className="hidden lg:inline">{t('header.chat')}</span>
          </Button>
        )}
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
