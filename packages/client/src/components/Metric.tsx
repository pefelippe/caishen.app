import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Grid that lays out Metrics side by side, wrapping on narrow screens. */
export function Metrics({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-5">
      {children}
    </div>
  );
}

interface Props {
  label: string;
  note?: ReactNode;
  noteClassName?: string;
  value: ReactNode;
  valueClassName?: string;
}

/** A ledger entry: the label, the figure in tabular digits under it, and an optional note. */
export function Metric({ label, note, noteClassName, value, valueClassName }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className={cn('text-lg font-medium tabular-nums', valueClassName)}>{value}</strong>
      {note && <span className={cn('text-sm text-muted-foreground', noteClassName)}>{note}</span>}
    </div>
  );
}
