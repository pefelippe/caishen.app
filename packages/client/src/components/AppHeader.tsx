import { MessageCircleIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { useI18n } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';
import { Logo } from './Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';

/**
 * The bar across the top, on the page's ink: the Caishen's mark on the left (and, on a phone, the
 * menu button); on the right the chat with the Caishen, the Alerts and the account.
 */
export function AppHeader({ user }: { user: { email: string; name: string } }) {
  const { pathname } = useLocation();
  const { open, toggle } = useChatPanel();
  const { t } = useI18n();

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 px-3 text-header-foreground md:px-4 print:hidden">
      <SidebarTrigger
        aria-label={t('header.menu')}
        className="size-9 rounded-full text-header-foreground hover:bg-white/10 hover:text-header-foreground md:hidden"
      />
      <Link aria-label={t('rail.caishen')} className="flex items-center px-1" to="/">
        <Logo size={26} />
      </Link>

      <div className="ml-auto flex items-center gap-1">
        {pathname !== '/chat' && (
          <Button
            aria-expanded={open}
            aria-label={t('chat.toggle')}
            className={cn(
              'mr-1 h-9 gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-header-foreground hover:bg-white/20 hover:text-header-foreground',
              open && 'border-gold/60 bg-gold/15'
            )}
            onClick={toggle}
          >
            <MessageCircleIcon className="size-4" />
            <span className="hidden sm:inline">{t('header.chat')}</span>
          </Button>
        )}
        <NotificationsMenu />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
