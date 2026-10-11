import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
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

/** A ledger entry: small label, the figure in the mono face, a rule on the left. */
export function Metric({ label, note, noteClassName, value, valueClassName }: Props) {
  return (
    <Card className="gap-0.5 rounded-none border-0 border-l border-border bg-transparent py-0.5 pl-3">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <strong className={cn('text-lg font-medium tabular-nums', valueClassName)}>{value}</strong>
      {note && <span className={cn('text-xs text-muted-foreground', noteClassName)}>{note}</span>}
    </Card>
  );
}
