import type { FitnessWeekFieldsFragment } from '@mny/graphql/client';

import { cn } from '@/lib/utils';

import { formatDate } from '../lib/format';

/** The week as a row of marks: one per Treino of the Meta Semanal, inked as they get done. */
export function WeekMeter({
  className,
  week,
}: {
  className?: string;
  week: FitnessWeekFieldsFragment;
}) {
  const slots = Math.max(week.goal ?? 0, week.done);
  return (
    <div className={cn('flex flex-col gap-2', className)} data-area="FITNESS">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-5xl leading-none">{week.done}</span>
        <span className="text-muted-foreground">
          {week.goal ? `de ${week.goal} Treinos` : week.done === 1 ? 'Treino' : 'Treinos'} ·{' '}
          <span className="tabular-nums">{week.minutes} min</span>
        </span>
      </div>
      {slots > 0 && (
        <div aria-hidden className="flex gap-1.5">
          {Array.from({ length: slots }, (_, index) => (
            <span
              className={cn(
                'h-2 w-9 rounded-full border border-ink',
                index < week.done ? 'bg-ink' : 'bg-transparent'
              )}
              key={index}
            />
          ))}
        </div>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(week.weekStart)} a {formatDate(week.weekEnd)}
      </span>
    </div>
  );
}
