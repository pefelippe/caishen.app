import { Link, useLocation } from 'react-router-dom';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';
import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { cn } from '@zapbots/ui/lib/utils';

import { HEADER_ICON } from '../lib/header';
import { useI18n } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu, type ProfileUser } from './ProfileMenu';

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
      className={cn(HEADER_ICON, 'hidden md:inline-flex')}
      onClick={toggle}
      size="icon"
      title={t('header.chat')}
      variant="ghost"
    >
      <AgentIcon className="size-[18px]" />
    </Button>
  );
}

/**
 * The white bar over the screen, after Mercado Pago's: on the right the Alerts, the Agente and the
 * avatar with the User's name, whose menu holds the account's screens, the language, the theme and signing out.
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
        <NotificationsMenu />
        <AgentButton />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
