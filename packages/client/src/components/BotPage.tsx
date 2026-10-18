import type { BotKey } from '@zapbots/graphql/client';
import type { ReactNode } from 'react';

import { ChatDock } from './ChatDock';

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
 * The content of a tab on a Bot's page (Finanças, Trabalhos…): a title, the content, and the
 * Bot's chat floating in the corner, ready to talk about what is on screen.
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
    <div className="flex min-w-0 flex-col gap-8" data-bot={bot}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow}
          <h1>{title}</h1>
          {description && <p className="mt-1 max-w-prose text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
      <ChatDock bot={bot} suggestions={suggestions} />
    </div>
  );
}
