import type { BotKey } from '@zapbots/graphql/client';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** What each Bot carries on its belly: the one thing that tells the family apart. */
const MARKS: Record<BotKey, ReactNode> = {
  // Rising bars.
  FINANCE: <path d="M18.5 35v-3.5M24 35v-6M29.5 35v-8.5" />,
};

interface Props {
  bot: BotKey;
  className?: string;
  /** Rendered size in pixels. */
  size?: number;
}

/**
 * The Bot family: one ink blot with eyes, filled with the ink of its Bot. An original character;
 * it borrows no one's mascot.
 */
export function BotGlyph({ bot, className, size = 32 }: Props) {
  return (
    <svg
      aria-hidden
      className={cn('shrink-0', className)}
      data-bot={bot}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path
        className="fill-ink"
        d="M24 5.5c9.8 0 16.5 6.3 16.5 15.8 0 4.3-1.3 7.5-1.3 11.2 0 5.8-4.6 10-15.2 10S8.8 38.300 8.8 32.500c0-3.700-1.300-6.900-1.300-11.200C7.500 11.800 14.200 5.500 24 5.500Z"
      />
      <g className="fill-background">
        <ellipse cx="18.8" cy="19.5" rx="1.9" ry="2.6" />
        <ellipse cx="29.2" cy="19.5" rx="1.9" ry="2.6" />
      </g>
      <g
        className="fill-none stroke-background"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      >
        {MARKS[bot]}
      </g>
    </svg>
  );
}
