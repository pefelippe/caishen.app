import type { AgendaKind, AgendaQuery, GoalKind, RepeatEvery } from '@zapbots/graphql/client';

import { Field } from '@zapbots/ui/blocks/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';

import { cn } from '@zapbots/ui/lib/utils';

import { formatCents } from '../../lib/format';
import { useI18n, type Language, type StringKey } from '../../lib/i18n';

/** How a Tarefa or an Evento repeats, as the API keeps it. */
export interface RepeatValue {
  every: RepeatEvery;
  interval: number;
  weekdays?: null | number[];
}

/** The repetitions a form offers; anything else saved shows as "Personalizada". */
const CHOICES = ['NONE', 'DAY', 'WEEKDAYS', 'WEEK', 'MONTH', 'YEAR'] as const;
type Choice = (typeof CHOICES)[number] | 'CUSTOM';

const LABELS: Record<Choice, StringKey> = {
  CUSTOM: 'personal.repeat.custom',
  DAY: 'personal.repeat.day',
  MONTH: 'personal.repeat.month',
  NONE: 'personal.repeat.none',
  WEEK: 'personal.repeat.week',
  WEEKDAYS: 'personal.repeat.weekdays',
  YEAR: 'personal.repeat.year',
};

const WORKDAYS = [1, 2, 3, 4, 5];

function choiceOf(repeat: null | RepeatValue | undefined): Choice {
  if (!repeat) return 'NONE';
  if (repeat.interval !== 1) return 'CUSTOM';
  const days = repeat.weekdays ?? [];
  if (repeat.every === 'WEEK' && days.join() === WORKDAYS.join()) return 'WEEKDAYS';
  if (days.length) return 'CUSTOM';
  return repeat.every;
}

function valueOf(choice: Choice, current: null | RepeatValue): null | RepeatValue {
  switch (choice) {
    case 'NONE':
      return null;
    case 'CUSTOM':
      return current;
    case 'WEEKDAYS':
      return { every: 'WEEK', interval: 1, weekdays: WORKDAYS };
    default:
      return { every: choice, interval: 1 };
  }
}

/** The repetition, said in words: "Toda semana". */
export function useRepeatLabel() {
  const { t } = useI18n();
  return (repeat: null | RepeatValue | undefined) => t(LABELS[choiceOf(repeat)]);
}

/** A field to pick how something repeats. */
export function RepeatField({
  onChange,
  value,
}: {
  onChange: (value: null | RepeatValue) => void;
  value: null | RepeatValue;
}) {
  const { t } = useI18n();
  const choice = choiceOf(value);
  return (
    <Field label={t('personal.repeat')}>
      <Select onValueChange={next => onChange(valueOf(next as Choice, value))} value={choice}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...CHOICES, ...(choice === 'CUSTOM' ? (['CUSTOM'] as const) : [])].map(option => (
            <SelectItem key={option} value={option}>
              {t(LABELS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** A repetition as the API takes it, without `__typename`. */
export const repeatInput = (repeat: null | RepeatValue | undefined) =>
  repeat
    ? { every: repeat.every, interval: repeat.interval, weekdays: repeat.weekdays ?? null }
    : null;

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const localeOf = (language: Language) => (language === 'pt' ? 'pt-BR' : 'en-US');

/** "Hoje", "Amanhã", "Ontem" or "qua., 12 de nov." */
export function useDayLabel() {
  const { language, t } = useI18n();
  return (date: string, today: string) => {
    if (date === today) return t('personal.today');
    if (date === addDays(today, 1)) return t('personal.tomorrow');
    if (date === addDays(today, -1)) return t('personal.yesterday');
    return new Date(`${date}T12:00:00`).toLocaleDateString(localeOf(language), {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
      year: date.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
    });
  };
}

/** The names of the weekdays, Sunday first: "dom.", "seg."… */
export function weekdayNames(language: Language): string[] {
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    new Date(Date.UTC(2026, 10, 1 + index, 12)).toLocaleDateString(localeOf(language), {
      timeZone: 'UTC',
      weekday: 'short',
    })
  );
}

/** "novembro de 2026". */
export function monthTitle(month: string, language: Language): string {
  return new Date(`${month}-15T12:00:00`).toLocaleDateString(localeOf(language), {
    month: 'long',
    year: 'numeric',
  });
}

/** "09:30" or "09:30–10:00". */
export const hours = (start: null | string | undefined, end?: null | string) =>
  start ? (end ? `${start}–${end}` : start) : '';

/**
 * Each kind of line in its own colour: Eventos in the primary, Tarefas in success, bills in
 * warning, events from the User's other calendars in a quiet grey.
 */
export const KIND_DOT: Record<AgendaKind, string> = {
  DUE: 'bg-warning',
  EVENT: 'bg-primary',
  EXTERNAL: 'bg-muted-foreground/60',
  TASK: 'bg-success',
};

type AgendaItem = AgendaQuery['agenda'][number];

/** One line of the Agenda: its colour, hour, title and, for a bill, the amount. */
export function AgendaLine({
  item,
  onOpen,
}: {
  item: AgendaItem;
  onOpen: (item: AgendaItem) => void;
}) {
  return (
    <li>
      <button
        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
        onClick={() => onOpen(item)}
        type="button"
      >
        <span className={cn('size-2 shrink-0 rounded-full', KIND_DOT[item.kind])} />
        <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
          {hours(item.startTime, item.endTime)}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            item.done && 'text-muted-foreground line-through'
          )}
        >
          {item.title}
        </span>
        {item.source && (
          <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground">
            {item.source}
          </span>
        )}
        {item.amountCents !== null && item.amountCents !== undefined && (
          <span className="shrink-0 font-medium tabular-nums">{formatCents(item.amountCents)}</span>
        )}
      </button>
    </li>
  );
}

/** An amount in the Meta's unit: R$ for money, "3 livros" for a count. */
export function useGoalAmount() {
  const { t } = useI18n();
  return (goal: { kind: GoalKind; unit?: null | string }, amount: number) =>
    goal.kind === 'MONEY'
      ? formatCents(amount)
      : goal.kind === 'CHECK'
        ? amount >= 1
          ? t('personal.goals.done')
          : t('personal.goals.notDone')
        : `${amount.toLocaleString('pt-BR')}${goal.unit ? ` ${goal.unit}` : ''}`;
}

/** How far a Meta got, 0 to 100. */
export const percentOf = (goal: { progress: number; target: number }) =>
  Math.max(0, Math.min(100, (goal.progress / goal.target) * 100));
