import { addMonths, dateInMonth, type IsoDate } from './dates';
import type { Cents } from './money';

/** An Imposto as declared: every month, or once a year in `installments` from `dueMonth`. */
export interface TaxInput {
  /** A month's amount when MONTHLY; the year's total when YEARLY. */
  amountCents: Cents;
  dueDay: number;
  /** YEARLY: the month (1–12) of the first installment. */
  dueMonth: number | null;
  frequency: 'MONTHLY' | 'YEARLY';
  installments: number;
}

/**
 * What an Imposto charges in one month (`YYYY-MM`): nothing, or one payment on its due day. A yearly
 * one is split in whole cents, the odd cents on the first installment so the year adds up exactly.
 * Installments that run past December go on into the next year's first months.
 */
export function taxDueInMonth(
  tax: TaxInput,
  yearMonth: string
): { amountCents: Cents; dueDate: IsoDate; installment: number } | null {
  const dueDate = dateInMonth(yearMonth, tax.dueDay);
  if (tax.frequency === 'MONTHLY') {
    return { amountCents: tax.amountCents, dueDate, installment: 1 };
  }
  const installments = Math.max(1, tax.installments);
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  // The installment that falls in this month, counting from this year's or last year's first.
  for (const startYear of [year, year - 1]) {
    const first = `${startYear}-${String(tax.dueMonth ?? 1).padStart(2, '0')}-01`;
    for (let index = 0; index < installments; index++) {
      if (addMonths(first, index).slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`) {
        continue;
      }
      const base = Math.floor(tax.amountCents / installments);
      const odd = tax.amountCents - base * installments;
      return { amountCents: index === 0 ? base + odd : base, dueDate, installment: index + 1 };
    }
  }
  return null;
}
