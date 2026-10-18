import type { BotKey } from '@zapbots/graphql/client';
import { MessageCircleIcon, Minimize2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { teamBot } from '../lib/bots';
import { BotGlyph } from './BotGlyph';
import { BotPanel } from './BotPanel';

const STORAGE_KEY = 'zapbots.chatDock';

function storedOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'open';
  } catch {
    return false;
  }
}

interface Props {
  bot: BotKey;
  suggestions?: string[];
}

/**
 * The Bot's chat as a floating panel in the lower right corner, over whatever screen is open. It
 * stays open or collapsed across screens.
 */
export function ChatDock({ bot, suggestions }: Props) {
  const [open, setOpen] = useState(storedOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? 'open' : 'closed');
    } catch {
      // Without storage the panel just starts collapsed next time.
    }
  }, [open]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          className="pointer-events-auto flex h-[min(600px,calc(100svh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col rounded-lg border bg-background p-4 shadow-lg"
          data-bot={bot}
        >
          <BotPanel
            actions={
              <Button
                aria-label="Recolher conversa"
                onClick={() => setOpen(false)}
                size="icon-sm"
                title="Recolher"
                variant="ghost"
              >
                <Minimize2Icon />
              </Button>
            }
            bot={bot}
            className="h-full"
            suggestions={suggestions}
          />
        </div>
      )}
      <Button
        aria-expanded={open}
        aria-label={open ? 'Recolher conversa' : `Conversar com ${teamBot(bot).name}`}
        className={cn(
          'pointer-events-auto h-12 gap-2 rounded-full pr-5 pl-2 shadow-lg',
          open && 'hidden'
        )}
        data-bot={bot}
        onClick={() => setOpen(true)}
      >
        <BotGlyph bot={bot} className="ring-2 ring-paper" size={32} />
        <MessageCircleIcon className="size-4" />
        Conversar com {teamBot(bot).name}
      </Button>
    </div>
  );
}
