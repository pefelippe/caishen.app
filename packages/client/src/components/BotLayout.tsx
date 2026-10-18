import type { BotKey } from '@zapbots/graphql/client';
import { MessageCircleIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BOT_SECTIONS, teamBot } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import { BotGlyph } from './BotGlyph';

/**
 * A Bot's page: who it is and its tabs on top (what its field needs, like Finanças or Trabalhos),
 * the open tab below. The chat opens from the header, or from the button floating in the corner.
 */
export function BotLayout({ bot }: { bot: BotKey }) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const member = teamBot(bot);
  const sections = BOT_SECTIONS[bot];
  // The longest matching path wins, so /caishen/trabalhos/1 lights Trabalhos.
  const current = [...sections]
    .sort((a, b) => b.to.length - a.to.length)
    .find(section => pathname === section.to || pathname.startsWith(`${section.to}/`));

  return (
    <div className="flex h-full min-h-0 flex-col" data-bot={bot}>
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-4 pt-3 md:px-6">
        <div className="flex items-center gap-3 pb-3">
          <BotGlyph bot={bot} size={40} />
          <div className="leading-tight">
            <div className="font-serif text-xl">{member.name}</div>
            <div className="text-xs text-muted-foreground">{member.field}</div>
          </div>
        </div>
        <nav aria-label={`Abas do ${member.name}`} className="flex gap-1 self-end">
          {sections.map(section => (
            <Button
              asChild
              className={cn(
                'h-10 rounded-none border-b-2 border-transparent px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
                current === section && 'border-ink text-foreground'
              )}
              key={section.to}
              variant="ghost"
            >
              <NavLink to={section.to}>{section.label}</NavLink>
            </Button>
          ))}
        </nav>
        <Button asChild className="mb-3 ml-auto" size="sm">
          <NavLink to={`/c/new?bot=${bot}`}>
            <MessageCircleIcon />
            {t('bot.chatWith', { name: member.name })}
          </NavLink>
        </Button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="page-enter w-full px-5 pt-8 pb-24 md:px-10" key={pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
