import { db, schema, type IncomeSourceRow } from '@zapbots/database';
import { dateInMonth, Decimal, foreignToBrlCents, INCOMING_IOF } from '@zapbots/finance';
import { and, eq } from 'drizzle-orm';

import { dollarRate } from './exchange';

/** One payment of a Fonte de Renda in a month, in reais; a foreign one with how it was converted. */
export interface IncomePayment {
  amountCents: number;
  date: string;
  /** For a foreign payment: the amount in its currency, the rate used and where it came from. */
  foreign: {
    amountCents: number;
    currency: 'USD';
    /** `null` when there is no rate yet: the payment then counts as zero. */
    rate: Decimal | null;
    /** PTAX: the Banco Central's, of `rateDate`. INFORMED: the User's, over it. */
    rateSource: 'INFORMED' | 'PTAX';
    rateDate: string | null;
  } | null;
}

/** The month's total split over the paydays, the odd cents on the first. */
function split(totalCents: number, parts: number): number[] {
  const each = Math.floor(totalCents / parts);
  return Array.from({ length: parts }, (_, index) =>
    index === 0 ? totalCents - each * (parts - 1) : each
  );
}

/** What a Fonte de Renda's payment of `amountCents` (in its currency) on `rate` comes to in reais. */
export function toReais(source: IncomeSourceRow, amountCents: number, rate: Decimal.Value) {
  return foreignToBrlCents(amountCents, rate, {
    iof: source.iofRate ?? INCOMING_IOF,
    spread: source.spreadRate ?? 0,
  });
}

/**
 * A Fonte de Renda's payments in `yearMonth` (`YYYY-MM`). In reais: one payment of the month's total
 * on the first payday, as before. In dollars: one per payday, each its part of the month, at the rate
 * the User typed for that day or else the PTAX, less spread and IOF.
 */
export async function incomePayments(
  source: IncomeSourceRow,
  yearMonth: string
): Promise<IncomePayment[]> {
  const days = source.paydays.length ? source.paydays : [1];
  const running = (date: string) =>
    date >= source.startsOn && (!source.endsOn || date <= source.endsOn);

  if (source.currency === 'BRL') {
    const date = dateInMonth(yearMonth, days[0]!);
    return [{ amountCents: source.monthlyNetCents, date, foreign: null }];
  }

  const overrides = await db
    .select()
    .from(schema.incomeRateOverride)
    .where(and(eq(schema.incomeRateOverride.incomeSourceId, source.id)));
  const parts = split(source.monthlyNetCents, days.length);
  const payments: IncomePayment[] = [];
  for (const [index, day] of days.entries()) {
    const date = dateInMonth(yearMonth, day);
    if (!running(date)) continue;
    const typed = overrides.find(row => row.date === date);
    const ptax = typed ? null : await dollarRate(date);
    const rate = typed ? new Decimal(typed.rate) : (ptax?.rate ?? null);
    payments.push({
      amountCents: rate ? toReais(source, parts[index]!, rate) : 0,
      date,
      foreign: {
        amountCents: parts[index]!,
        currency: 'USD',
        rate,
        rateDate: typed ? date : (ptax?.date ?? null),
        rateSource: typed ? 'INFORMED' : 'PTAX',
      },
    });
  }
  return payments;
}

/** A Fonte de Renda's month in reais, at today's rate when it is foreign: for totals and the Score. */
export async function monthlyNetBrlCents(source: IncomeSourceRow, asOf: string): Promise<number> {
  if (source.currency === 'BRL') return source.monthlyNetCents;
  const ptax = await dollarRate(asOf);
  return ptax ? toReais(source, source.monthlyNetCents, ptax.rate) : 0;
}
