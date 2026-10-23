import { dateInMonth, type IsoDate } from './dates';

export interface RecurringInput {
  cycle: 'MONTHLY' | 'YEARLY';
  dueDay: number;
  /** YEARLY only: the month it is charged, 1–12. */
  dueMonth?: number | null;
  /** Cancelled from this day on; no charge on or after it. */
  endsOn?: string | null;
  startsOn?: string | null;
}

/**
 * When a Gasto recorrente is charged in `yearMonth` (`YYYY-MM`), or `null` if it is not: a monthly
 * one every month, a yearly one in its month, never before it starts nor from its cancellation on.
 * A day past the month's end falls on its last day (the 31st in February is the 28th or 29th).
 */
export function recurringDueInMonth(item: RecurringInput, yearMonth: string): IsoDate | null {
  if (item.cycle === 'YEARLY' && Number(yearMonth.slice(5, 7)) !== item.dueMonth) return null;
  const dueDate = dateInMonth(yearMonth, item.dueDay);
  if (item.startsOn && dueDate < item.startsOn) return null;
  if (item.endsOn && dueDate >= item.endsOn) return null;
  return dueDate;
}
