import type { RiskBand } from '@mny/graphql/client';

export const BAND_LABEL: Record<RiskBand, string> = {
  HIGH: 'Alto risco',
  LOW: 'Baixo risco',
  MEDIUM: 'Médio risco',
};

const TONE: Record<RiskBand, string> = { HIGH: 'bad', LOW: 'good', MEDIUM: 'warn' };

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
    <span className={`score ${TONE[band]} ${large ? 'large' : ''}`} title={BAND_LABEL[band]}>
      {score}
      {large && <small>{BAND_LABEL[band]}</small>}
    </span>
  );
}
