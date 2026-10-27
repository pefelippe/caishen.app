import type {
  MacroDayFieldsFragment,
  MacroTargetFieldsFragment,
  MealKind,
} from '@zapbots/graphql/client';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from 'lucide-react';

import { Button } from '@zapbots/ui/components/button';
import { Progress } from '@zapbots/ui/components/progress';
import { cn } from '@zapbots/ui/lib/utils';

import { localToday } from '../../lib/bots';
import { useI18n, type StringKey } from '../../lib/i18n';
import { addDays, useDayLabel, weekdayNames } from '../personal/shared';

/** The Fitness pages paint in the area's colour (`--area-fitness`). */
export const FITNESS_BAR = 'bg-area-fitness/15 [&>[data-slot=progress-indicator]]:bg-area-fitness';

/** A whole number typed in a field, or null when empty; NaN when not a number, for the server to refuse. */
export const wholeOrNull = (text: string): null | number =>
  text.trim() === '' ? null : Number(text.trim());

export const MEAL_KINDS: MealKind[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'OTHER'];

export const MACROS = [
  { key: 'kcal', label: 'fitness.macros.kcal', short: 'fitness.macros.kcal', unit: 'kcal' },
  {
    key: 'proteinG',
    label: 'fitness.macros.protein',
    short: 'fitness.macros.proteinShort',
    unit: 'g',
  },
  { key: 'carbsG', label: 'fitness.macros.carbs', short: 'fitness.macros.carbsShort', unit: 'g' },
  { key: 'fatG', label: 'fitness.macros.fat', short: 'fitness.macros.fatShort', unit: 'g' },
] as const satisfies {
  key: keyof MacroTargetFieldsFragment & keyof MacroDayFieldsFragment;
  label: StringKey;
  short: StringKey;
  unit: string;
}[];

/** One macro of a day against its target: the amount, the target and a bar when there is one. */
export function MacroMeter({
  label,
  target,
  unit,
  value,
}: {
  label: string;
  target: null | number | undefined;
  unit: string;
  value: number;
}) {
  const { language, t } = useI18n();
  const number = (n: number) => n.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US');
  const over = Boolean(target && value > target);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className={cn('font-semibold', over && 'text-warning')}>
            {number(value)} {unit}
          </span>
          {target ? (
            <span className="text-muted-foreground">
              {' '}
              {t('fitness.macros.ofTarget', { target: number(target) })}
            </span>
          ) : null}
        </span>
      </div>
      {target ? (
        <Progress className={FITNESS_BAR} value={Math.min(100, (value / target) * 100)} />
      ) : null}
    </div>
  );
}

/** A day walked with arrows, "Hoje" to come back. */
export function DayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const today = localToday();
  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label={t('fitness.previousDay')}
        onClick={() => onChange(addDays(date, -1))}
        size="icon"
        variant="ghost"
      >
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-32 text-center font-medium capitalize">{dayLabel(date, today)}</span>
      <Button
        aria-label={t('fitness.nextDay')}
        onClick={() => onChange(addDays(date, 1))}
        size="icon"
        variant="ghost"
      >
        <ChevronRightIcon />
      </Button>
      {date !== today && (
        <Button onClick={() => onChange(today)} size="sm" variant="outline">
          {t('fitness.today')}
        </Button>
      )}
    </div>
  );
}

/** The weekdays as toggles, Sunday first. */
export function WeekdayPicker({
  onChange,
  value,
}: {
  onChange: (days: number[]) => void;
  value: number[];
}) {
  const { language } = useI18n();
  const names = weekdayNames(language);
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name, day) => {
        const on = value.includes(day);
        return (
          <Button
            aria-pressed={on}
            className={cn(
              'w-12 capitalize',
              on && 'border-area-fitness bg-area-fitness/10 text-foreground'
            )}
            key={day}
            onClick={() =>
              onChange(on ? value.filter(d => d !== day) : [...value, day].sort((a, b) => a - b))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {name.replace('.', '')}
          </Button>
        );
      })}
    </div>
  );
}

/** A night's quality, 1 to 5 stars; clicking the one set clears it. */
export function QualityStars({
  onChange,
  value,
}: {
  onChange?: (value: null | number) => void;
  value: null | number | undefined;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => {
        const icon = (
          <StarIcon
            className={cn(
              'size-4',
              value && star <= value ? 'fill-warning text-warning' : 'text-muted-foreground/40'
            )}
          />
        );
        return onChange ? (
          <Button
            aria-label={String(star)}
            key={star}
            onClick={() => onChange(value === star ? null : star)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {icon}
          </Button>
        ) : (
          <span key={star}>{icon}</span>
        );
      })}
    </div>
  );
}

/** A small line of values, oldest to newest, scaled to its own range. */
export function Sparkline({ className, values }: { className?: string; values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 100},${30 - ((value - min) / span) * 28 - 1}`
    )
    .join(' ');
  return (
    <svg
      aria-hidden
      className={cn('h-10 w-full text-area-fitness', className)}
      preserveAspectRatio="none"
      viewBox="0 0 100 30"
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
