import type { BotKey } from '@zapbots/graphql/client';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { BotGlyph } from './BotGlyph';
import { BotPanel } from './BotPanel';

interface Props {
  actions?: ReactNode;
  bot: BotKey;
  children: ReactNode;
  description?: ReactNode;
  /** Shown above the title, e.g. a BackLink. */
  eyebrow?: ReactNode;
  suggestions?: string[];
  title: ReactNode;
}

/**
 * The frame of every screen of a Bot: the content on the left and the Bot's chat on the right. On
 * narrower screens the chat moves into a sheet opened from the header.
 */
export function BotPage({
  actions,
  bot,
  children,
  description,
  eyebrow,
  suggestions,
  title,
}: Props) {
  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_21rem]" data-bot={bot}>
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {eyebrow}
            <h1>{title}</h1>
            {description && <p className="mt-1 max-w-prose text-muted-foreground">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <Sheet>
              <SheetTrigger asChild>
                <Button className="xl:hidden" variant="outline">
                  <BotGlyph bot={bot} size={18} />
                  Conversar
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full gap-0 p-5 sm:max-w-md">
                <SheetTitle className="sr-only">Conversa</SheetTitle>
                <BotPanel bot={bot} className="h-full" suggestions={suggestions} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        {children}
      </div>
      <aside className="hidden xl:block">
        <BotPanel
          bot={bot}
          className="sticky top-8 h-[calc(100svh-4rem)]"
          suggestions={suggestions}
        />
      </aside>
    </div>
  );
}
