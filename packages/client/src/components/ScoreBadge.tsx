import type { RiskBand } from '@mny/graphql/client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const BAND_LABEL: Record<RiskBand, string> = {
  HIGH: 'Alto risco',
  LOW: 'Baixo risco',
  MEDIUM: 'Médio risco',
};

const TONE: Record<RiskBand, string> = {
  HIGH: 'bg-destructive',
  LOW: 'bg-success',
  MEDIUM: 'bg-warning',
};

export function ScoreBadge({
  band,
  large,
  score,
}: {
  band: RiskBand;
  large?: boolean;
  score: number;
}) {
  return (
    <Badge
      className={cn(
        'flex-col border-transparent font-bold tabular-nums text-white',
        TONE[band],
        large && 'rounded-lg px-4 py-2 text-3xl leading-tight'
      )}
      title={BAND_LABEL[band]}
    >
      {score}
      {large && <small className="text-xs font-medium">{BAND_LABEL[band]}</small>}
    </Badge>
  );
}
