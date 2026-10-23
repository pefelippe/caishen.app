import type { BotKey } from '@zapbots/graphql/client';
import { BotIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { CaishenMark } from './Logo';

/** The icon of each working Bot. */
const ICONS: Record<BotKey, LucideIcon> = {
  FINANCE: CaishenMark,
};

interface Props {
  /** `null` for a Bot still to come: neutral ink. */
  bot: BotKey | null;
  className?: string;
  /** Overrides the icon, e.g. for Bots still to come, which have no key yet. */
  icon?: LucideIcon;
  /** Rendered size in pixels. */
  size?: number;
}

/** A Bot's avatar: a circle in the Bot's ink with its icon in paper. */
export function BotGlyph({ bot, className, icon, size = 32 }: Props) {
  const Icon = icon ?? (bot ? ICONS[bot] : BotIcon);
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-paper',
        bot ? 'bg-ink' : 'bg-muted-foreground',
        className
      )}
      data-bot={bot ?? undefined}
      style={{ height: size, width: size }}
    >
      <Icon strokeWidth={2} style={{ height: size * 0.55, width: size * 0.55 }} />
    </span>
  );
}
