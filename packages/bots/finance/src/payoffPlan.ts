import { amortizationSchedule, outstandingBalance, type ScheduleInput } from './amortization';
import { addDays, addMonths, type IsoDate } from './dates';
import { Decimal, type Cents } from './money';
import { payoffOutlook } from './payoff';

/** A Credit Operation as the plan sees it. */
export interface PlanDebt {
  id: string;
  input: ScheduleInput;
}

export interface PayoffPlan {
  /** When the last installment of the last Operation falls, with the plan; `null` with no debt. */
  debtFreeOn: IsoDate | null;
  /** The same date without the plan. */
  debtFreeWithoutPlanOn: IsoDate | null;
  interestSavedCents: Cents;
  /** When each Operation ends with the plan, in the order they are paid off. */
  payoffs: { id: string; paidOffOn: IsoDate }[];
}

/** Longer than any term we hold (360 months), so the plan always ends. */
const MAX_MONTHS = 600;

const lastDueDate = (input: ScheduleInput) => amortizationSchedule(input).at(-1)?.dueDate ?? null;
const latest = (dates: (IsoDate | null)[]) =>
  dates.reduce<IsoDate | null>((max, date) => (date && (!max || date > max) ? date : max), null);

/**
 * Plano de Quitação by the avalanche method: from the day after `asOf`, every month
 * `monthlyExtraCents` goes as an Extra Amortization to the Operation with the highest rate that
 * still has a balance; what is left over once it is paid off goes to the next one.
 */
export function avalanchePlan(
  debts: PlanDebt[],
  asOf: IsoDate,
  monthlyExtraCents: Cents
): PayoffPlan {
  if (monthlyExtraCents <= 0) throw new Error('monthlyExtraCents must be positive');
  const byRate = [...debts].sort((a, b) =>
    new Decimal(b.input.monthlyRate).cmp(a.input.monthlyRate)
  );
  const plans = byRate.map(debt => ({
    debt,
    input: { ...debt.input, extraAmortizations: [...(debt.input.extraAmortizations ?? [])] },
  }));

  const start = addDays(asOf, 1);
  for (let month = 0; month < MAX_MONTHS; month++) {
    const date = addMonths(start, month);
    let left = monthlyExtraCents;
    for (const plan of plans) {
      if (left <= 0) break;
      const balance = outstandingBalance(
        amortizationSchedule(plan.input),
        plan.input.principalCents,
        date
      );
      if (balance <= 0) continue;
      const amountCents = Math.min(left, balance);
      plan.input.extraAmortizations.push({ amountCents, date });
      left -= amountCents;
    }
    // Nothing took any of this month's money: every Operation is paid off.
    if (left === monthlyExtraCents) break;
  }

  const remainingInterest = (input: ScheduleInput) =>
    payoffOutlook(amortizationSchedule(input), asOf).remainingInterestCents;
  const payoffs = plans
    .map(plan => ({ id: plan.debt.id, paidOffOn: lastDueDate(plan.input) }))
    .filter((payoff): payoff is { id: string; paidOffOn: IsoDate } => payoff.paidOffOn !== null)
    .sort((a, b) => a.paidOffOn.localeCompare(b.paidOffOn));

  return {
    debtFreeOn: latest(plans.map(plan => lastDueDate(plan.input))),
    debtFreeWithoutPlanOn: latest(debts.map(debt => lastDueDate(debt.input))),
    interestSavedCents: plans.reduce(
      (sum, plan) => sum + remainingInterest(plan.debt.input) - remainingInterest(plan.input),
      0
    ),
    payoffs,
  };
}
