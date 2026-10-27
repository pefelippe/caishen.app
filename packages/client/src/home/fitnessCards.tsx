import { useQuery } from '@apollo/client/react';
import { HomeFitnessDocument, HomeMeasuresDocument } from '@zapbots/graphql/client';
import { formatMeasure, hoursLabel, measureTrend } from '@zapbots/fitness';
import { BedIcon, DumbbellIcon } from 'lucide-react';

import { localToday } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import { MacroMeter, MACROS, Sparkline } from '../pages/fitness/shared';
import { useDayLabel } from '../pages/personal/shared';
import { Empty, Lines, Panel } from './panel';

/** Fitness hoje: what was eaten against the targets, today's Ficha and last night. */
export function FitnessCard() {
  const { t } = useI18n();
  const { data } = useQuery(HomeFitnessDocument, { fetchPolicy: 'cache-and-network' });
  const today = data?.fitnessToday;

  return (
    <Panel
      link={{ label: t('home.fitness.open'), to: '/fitness/diet' }}
      title={t('home.card.fitness')}
    >
      {!today ? (
        <Lines count={4} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {MACROS.map(macro => (
              <MacroMeter
                key={macro.key}
                label={t(macro.short)}
                target={today.target?.[macro.key]}
                unit={macro.unit}
                value={today.eaten[macro.key]}
              />
            ))}
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
              <DumbbellIcon className="size-4 shrink-0 text-area-fitness" />
              <span className="min-w-0 truncate">
                {today.plans.length
                  ? today.plans.map(plan => plan.name).join(', ')
                  : t('home.fitness.rest')}
                {today.done.length > 0 && (
                  <span className="text-muted-foreground"> · {t('home.fitness.done')}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
              <BedIcon className="size-4 shrink-0 text-area-fitness" />
              <span className="min-w-0 truncate">
                {t('home.fitness.sleep')}:{' '}
                {today.lastSleep && today.lastSleep.wokeOn === localToday() ? (
                  <span className="font-semibold tabular-nums">
                    {hoursLabel(today.lastSleep.minutes)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('home.fitness.noSleep')}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Peso: the last weight, how it moved in 30 days, and its line. */
export function MeasuresCard() {
  const { language, t } = useI18n();
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const dayLabel = useDayLabel();
  const { data } = useQuery(HomeMeasuresDocument, { fetchPolicy: 'cache-and-network' });
  const points = data?.measurements ?? [];
  const trend = measureTrend(points, 'WEIGHT');

  return (
    <Panel
      link={{ label: t('home.measures.open'), to: '/fitness/measures' }}
      title={t('home.card.measures')}
    >
      {!data ? (
        <Lines count={2} />
      ) : !trend ? (
        <Empty>{t('home.measures.empty')}</Empty>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-display text-4xl font-light tracking-[-0.022em] tabular-nums">
            {formatMeasure('WEIGHT', trend.latest.value, locale)}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {dayLabel(trend.latest.measuredOn, localToday())}
            {trend.change !== null &&
              ` · ${t('fitness.measures.change', {
                change: `${trend.change > 0 ? '+' : trend.change < 0 ? '−' : ''}${formatMeasure('WEIGHT', Math.abs(trend.change), locale)}`,
              })}`}
          </p>
          <Sparkline className="mt-2" values={points.slice(-30).map(point => point.value)} />
        </div>
      )}
    </Panel>
  );
}
