import { addDays, addMonths, type IsoDate } from './dates';
import { Decimal, toCents, type Cents, type Rate } from './money';

export type AmortizationSystem = 'PRICE' | 'SAC';

export interface ExtraAmortization {
  amountCents: Cents;
  date: IsoDate;
}

export interface ScheduleInput {
  extraAmortizations?: ExtraAmortization[];
  firstDueDate: IsoDate;
  monthlyRate: Rate;
  principalCents: Cents;
  system: AmortizationSystem;
  termMonths: number;
}

export interface Installment {
  amortizationCents: Cents;
  /** Balance after this installment and any Extra Amortization in its period. */
  balanceCents: Cents;
  dueDate: IsoDate;
  extraAmortizationCents: Cents;
  installmentCents: Cents;
  interestCents: Cents;
  number: number;
}

/** Constant installment of the Price system: P·i / (1 − (1+i)^−n). */
export function priceInstallment(
  principalCents: Cents,
  monthlyRate: Rate,
  termMonths: number
): Cents {
  const rate = new Decimal(monthlyRate);
  if (rate.isZero()) return toCents(new Decimal(principalCents).div(termMonths));
  const factor = new Decimal(1).minus(rate.plus(1).pow(-termMonths));
  return toCents(new Decimal(principalCents).times(rate).div(factor));
}

/** First (and largest) installment of the SAC system: P/n + P·i. */
export function sacFirstInstallment(
  principalCents: Cents,
  monthlyRate: Rate,
  termMonths: number
): Cents {
  const principal = new Decimal(principalCents);
  return toCents(principal.div(termMonths).plus(principal.times(monthlyRate)));
}

/**
 * The full installment schedule. Rows are rounded to cents as they go and the balance is carried
 * in cents, so the table always adds up; the last installment absorbs the rounding residue.
 *
 * An Extra Amortization is applied after the installment of the period it falls in and reduces
 * the term (installment stays constant in Price, amortization stays constant in SAC).
 */
export function amortizationSchedule(input: ScheduleInput): Installment[] {
  const { firstDueDate, principalCents, system, termMonths } = input;
  if (termMonths <= 0) throw new Error('termMonths must be positive');
  if (principalCents <= 0) throw new Error('principalCents must be positive');

  const rate = new Decimal(input.monthlyRate);
  const extras = [...(input.extraAmortizations ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const fixedInstallment = priceInstallment(principalCents, rate, termMonths);
  const fixedAmortization = toCents(new Decimal(principalCents).div(termMonths));

  const rows: Installment[] = [];
  let balance = principalCents;
  let previousDueDate = addDays(firstDueDate, -100_000);

  for (let number = 1; number <= termMonths && balance > 0; number++) {
    const dueDate = addMonths(firstDueDate, number - 1);
    const interest = toCents(rate.times(balance));

    let amortization = system === 'PRICE' ? fixedInstallment - interest : fixedAmortization;
    if (number === termMonths || amortization >= balance) amortization = balance;
    balance -= amortization;

    let extra = 0;
    for (const item of extras) {
      if (item.date > previousDueDate && item.date <= dueDate) extra += item.amountCents;
    }
    extra = Math.min(extra, balance);
    balance -= extra;

    rows.push({
      amortizationCents: amortization,
      balanceCents: balance,
      dueDate,
      extraAmortizationCents: extra,
      installmentCents: amortization + interest,
      interestCents: interest,
      number,
    });
    previousDueDate = dueDate;
  }

  return rows;
}

/** Outstanding Balance on `asOf`, presuming every installment due up to that date was paid. */
export function outstandingBalance(
  schedule: Installment[],
  principalCents: Cents,
  asOf: IsoDate
): Cents {
  let balance = principalCents;
  for (const row of schedule) {
    if (row.dueDate > asOf) break;
    balance = row.balanceCents;
  }
  return balance;
}

/** Sum of installments due in the half-open window (`asOf`, `asOf` + `days`]. */
export function dueWithin(schedule: Installment[], asOf: IsoDate, days: number): Cents {
  const end = addDays(asOf, days);
  return schedule
    .filter(row => row.dueDate > asOf && row.dueDate <= end)
    .reduce((sum, row) => sum + row.installmentCents, 0);
}
