import { MessageCircleIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { useI18n, type StringKey } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';

/** The name of each area, by the first part of its path. */
const TITLES: Record<string, StringKey> = {
  '': 'rail.dashboard',
  caishen: 'rail.caishen',
  chat: 'rail.chat',
  documents: 'rail.documents',
  integrations: 'rail.integrations',
  organization: 'rail.organization',
  plan: 'rail.plan',
  profile: 'menu.profile',
  workflows: 'rail.workflows',
};

/** The thin bar over every screen: where you are on the left, the chat with the Caishen on the right. */
export function TopBar() {
  const { pathname } = useLocation();
  const { open, toggle } = useChatPanel();
  const { t } = useI18n();
  const title = TITLES[pathname.split('/')[1] ?? ''];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-5">
      <span className="truncate font-medium">{title ? t(title) : ''}</span>
      {pathname !== '/chat' && (
        <Button
          aria-expanded={open}
          aria-label={t('chat.toggle')}
          onClick={toggle}
          size="sm"
          variant={open ? 'secondary' : 'outline'}
        >
          <MessageCircleIcon />
          {t('rail.caishen')}
        </Button>
      )}
    </header>
  );
}
