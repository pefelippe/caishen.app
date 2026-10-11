/** Dates are plain ISO calendar dates (`YYYY-MM-DD`); no time zones involved. */
export type IsoDate = string;

function parse(date: IsoDate): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid ISO date: ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function format(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Adds calendar months, clamping the day to the last day of the target month (Jan 31 + 1 = Feb 28). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = parse(date);
  const zeroBased = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1;
  return format(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = parse(date);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return format(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

/** The date in `yearMonth` (`YYYY-MM`) on `day`, clamped to the last day of that month. */
export function dateInMonth(yearMonth: string, day: number): IsoDate {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  return format(year, month, Math.min(day, daysInMonth(year, month)));
}

/** Where "today" is decided: due dates and weeks follow the calendar of Brazil, not UTC. */
export const TIME_ZONE = 'America/Sao_Paulo';

// The `en-CA` locale writes dates as `YYYY-MM-DD`.
const calendarDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

/** The calendar date of `instant` in `TIME_ZONE`. */
export function dateOf(instant: Date): IsoDate {
  return calendarDay.format(instant);
}

export function today(): IsoDate {
  return dateOf(new Date());
}
