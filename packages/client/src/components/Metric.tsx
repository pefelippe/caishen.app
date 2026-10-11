import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Grid that lays out Metric cards side by side, wrapping on narrow screens. */
export function Metrics({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">{children}</div>
  );
}

interface Props {
  label: string;
  note?: ReactNode;
  noteClassName?: string;
  value: ReactNode;
  valueClassName?: string;
}

export function Metric({ label, note, noteClassName, value, valueClassName }: Props) {
  return (
    <Card className="gap-0.5 px-3 py-2.5 shadow-none">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className={cn('text-lg', valueClassName)}>{value}</strong>
      {note && <span className={cn('text-xs text-muted-foreground', noteClassName)}>{note}</span>}
    </Card>
  );
}
