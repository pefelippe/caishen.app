import type { BotKey } from '@zapbots/graphql/client';
import type { ReactNode } from 'react';

interface Props {
  actions?: ReactNode;
  bot: BotKey;
  children: ReactNode;
  description?: ReactNode;
  /** Shown above the title, e.g. a BackLink. */
  eyebrow?: ReactNode;
  title: ReactNode;
}

/**
 * The content of a tab on a Bot's page (Finanças, Workflows…): a title and the content.
 */
export function BotPage({ actions, bot, children, description, eyebrow, title }: Props) {
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
    </div>
  );
}
