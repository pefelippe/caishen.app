import { addDays, addMonths, type IsoDate } from '@zapbots/finance';

/** How a Task or an Event repeats: every `interval` days, weeks, months or years. */
export interface Repeat {
  every: 'DAY' | 'MONTH' | 'WEEK' | 'YEAR';
  /** At least 1. */
  interval: number;
  /** For `WEEK` only: the weekdays it falls on, 0 (Sunday) to 6. Empty or missing: the start's. */
  weekdays?: number[];
}

/** At most this many dates from one series in a range, so a daily series over years stays cheap. */
const MAX_OCCURRENCES = 1000;

const weekday = (date: IsoDate) => new Date(`${date}T00:00:00Z`).getUTCDay();
const daysBetween = (from: IsoDate, to: IsoDate) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const step = (repeat: Repeat) => Math.max(1, Math.floor(repeat.interval));

/** The `index`-th date of the series, counted from `start` so month ends do not drift. */
function nth(start: IsoDate, repeat: Repeat, index: number): IsoDate {
  const n = index * step(repeat);
  switch (repeat.every) {
    case 'DAY':
      return addDays(start, n);
    case 'WEEK':
      return addDays(start, n * 7);
    case 'MONTH':
      return addMonths(start, n);
    case 'YEAR':
      return addMonths(start, n * 12);
  }
}

/** Weekly on chosen weekdays: the dates from `from` to `to` that fall in weeks that count. */
function onWeekdays(start: IsoDate, repeat: Repeat, from: IsoDate, to: IsoDate): IsoDate[] {
  const days = new Set(repeat.weekdays);
  const weekStart = addDays(start, -weekday(start));
  const dates: IsoDate[] = [];
  for (let date = from < start ? start : from; date <= to; date = addDays(date, 1)) {
    const week = Math.floor(daysBetween(weekStart, date) / 7);
    if (days.has(weekday(date)) && week % step(repeat) === 0) dates.push(date);
    if (dates.length === MAX_OCCURRENCES) break;
  }
  return dates;
}

/** Every date of the series that starts on `start` between `from` and `to`, both included. */
export function occurrences(start: IsoDate, repeat: Repeat, from: IsoDate, to: IsoDate): IsoDate[] {
  if (repeat.every === 'WEEK' && repeat.weekdays?.length)
    return onWeekdays(start, repeat, from, to);
  // Day and week series jump straight to near `from`; months and years are few anyway.
  let index = 0;
  if (from > start && (repeat.every === 'DAY' || repeat.every === 'WEEK')) {
    const span = step(repeat) * (repeat.every === 'WEEK' ? 7 : 1);
    index = Math.floor(daysBetween(start, from) / span);
  }
  const dates: IsoDate[] = [];
  for (let date = nth(start, repeat, index); date <= to; date = nth(start, repeat, ++index)) {
    if (date >= from) dates.push(date);
    if (dates.length === MAX_OCCURRENCES) break;
  }
  return dates;
}

/**
 * The first date of the series after `after` (by default the start itself): where a repeating
 * Task moves once it is done.
 */
export function nextOccurrence(start: IsoDate, repeat: Repeat, after: IsoDate = start): IsoDate {
  const from = addDays(after, 1);
  const months = repeat.every === 'YEAR' ? 12 * step(repeat) + 1 : step(repeat) + 1;
  return occurrences(start, repeat, from, addMonths(from, months))[0]!;
}

/** A Repeat read from saved JSON or from a Model's arguments, or null when it is not one. */
export function parseRepeat(value: unknown): null | Repeat {
  if (!value || typeof value !== 'object') return null;
  const { every, interval, weekdays } = value as Record<string, unknown>;
  if (every !== 'DAY' && every !== 'WEEK' && every !== 'MONTH' && every !== 'YEAR') return null;
  const n = Number(interval ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > 365) return null;
  const days = Array.isArray(weekdays)
    ? [...new Set(weekdays.map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  days.sort((a, b) => a - b);
  return every === 'WEEK' && days.length
    ? { every, interval: n, weekdays: days }
    : { every, interval: n };
}
