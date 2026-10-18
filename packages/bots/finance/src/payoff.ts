import { amortizationSchedule, type Installment, type ScheduleInput } from './amortization';
import { addDays, type IsoDate } from './dates';
import type { Cents } from './money';

/** What is left to pay on a Credit Operation after `asOf`. */
export interface PayoffOutlook {
  /** Due date of the last installment; `null` when nothing is left. */
  lastDueDate: IsoDate | null;
  remainingInstallments: number;
  /** Interest still to be paid if the schedule runs to the end. */
  remainingInterestCents: Cents;
}

export function payoffOutlook(schedule: Installment[], asOf: IsoDate): PayoffOutlook {
  const ahead = schedule.filter(row => row.dueDate > asOf);
  return {
    lastDueDate: ahead.at(-1)?.dueDate ?? null,
    remainingInstallments: ahead.length,
    remainingInterestCents: ahead.reduce((sum, row) => sum + row.interestCents, 0),
  };
}

/** What an Extra Amortization of `amountCents` paid on `asOf` would change. */
export interface PrepaymentEffect {
  installmentsSaved: number;
  interestSavedCents: Cents;
}

/**
 * Simulates an Extra Amortization paid the day after `asOf` (after the installments already due)
 * and compares what is left to pay with and without it. The amount is capped at the balance.
 */
export function prepaymentEffect(
  input: ScheduleInput,
  asOf: IsoDate,
  amountCents: Cents
): PrepaymentEffect {
  if (amountCents <= 0) throw new Error('amountCents must be positive');
  const before = payoffOutlook(amortizationSchedule(input), asOf);
  const after = payoffOutlook(
    amortizationSchedule({
      ...input,
      extraAmortizations: [
        ...(input.extraAmortizations ?? []),
        { amountCents, date: addDays(asOf, 1) },
      ],
    }),
    asOf
  );
  return {
    installmentsSaved: before.remainingInstallments - after.remainingInstallments,
    interestSavedCents: before.remainingInterestCents - after.remainingInterestCents,
  };
}
