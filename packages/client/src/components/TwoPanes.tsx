import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** List on the left, the open Conversation (or `empty`) on the right; one or the other on phones. */
export function TwoPanes({
  list,
  open,
  side,
}: {
  list: ReactNode;
  open: boolean;
  side: ReactNode;
}) {
  return (
    <div className="grid h-full min-h-0 md:grid-cols-[22rem_minmax(0,1fr)]">
      <div className={cn('min-h-0', open && 'hidden md:block')}>{list}</div>
      <div className={cn('min-h-0', !open && 'hidden md:block')}>{side}</div>
    </div>
  );
}
