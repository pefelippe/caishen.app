import { MessageCircleIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { useI18n } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';
import { Logo } from './Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * "Pergunte ao Caishen…" in the middle of the header: Enter starts a Conversation in the chat
 * panel with the question; ⌘K (Ctrl+K elsewhere) jumps here from anywhere. On a phone there is
 * no room for it; the chat button beside it opens the same chat.
 */
function AskField() {
  const { startNew } = useChatPanel();
  const { t } = useI18n();
  const field = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        field.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    startNew(text);
    setQuestion('');
    field.current?.blur();
  };

  return (
    <form className="relative hidden w-full max-w-xl sm:block" onSubmit={ask} role="search">
      <SparklesIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gold" />
      <Input
        aria-label={t('header.askLabel')}
        className="h-10 rounded-full border-white/15 bg-white/8 pr-16 pl-10 text-header-foreground shadow-none placeholder:text-header-foreground/55 focus-visible:border-gold/60 focus-visible:bg-white/12 focus-visible:ring-gold/25"
        onChange={event => setQuestion(event.target.value)}
        placeholder={t('header.ask')}
        ref={field}
        value={question}
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-white/15 px-1.5 py-0.5 font-sans text-[11px] text-header-foreground/60">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </form>
  );
}

/**
 * The navy bar across the top: the Caishen's mark on the left (and, on a phone, the menu button),
 * the question to the Caishen in the middle, and on the right the chat, the Alerts and the account.
 */
export function AppHeader({ user }: { user: { email: string; name: string } }) {
  const { pathname } = useLocation();
  const { open, toggle } = useChatPanel();
  const { t } = useI18n();
  // The chat page already is the chat: no question field or chat button there.
  const onChat = pathname === '/chat';

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 px-3 text-header-foreground md:px-4 print:hidden">
      <SidebarTrigger
        aria-label={t('header.menu')}
        className="size-9 rounded-full text-header-foreground hover:bg-white/10 hover:text-header-foreground md:hidden"
      />
      <Link
        aria-label={t('rail.caishen')}
        className="flex items-center gap-2.5 px-1 md:w-[calc(var(--sidebar-width)-1rem)]"
        to="/"
      >
        <Logo size={26} />
        <span className="hidden text-lg font-semibold tracking-tight sm:inline">Caishen</span>
      </Link>

      <div className="flex min-w-0 flex-1 justify-center px-2">{!onChat && <AskField />}</div>

      <div className="flex items-center gap-1">
        {!onChat && (
          <Button
            aria-expanded={open}
            aria-label={t('chat.toggle')}
            className={cn(
              'mr-1 size-9 gap-2 rounded-full border border-white/15 bg-white/8 text-header-foreground hover:bg-white/15 hover:text-header-foreground lg:w-auto lg:px-3.5',
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
