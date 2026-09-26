import { addDays, type IsoDate } from './dates';
import type { Cents } from './money';

/** Stage of a Credit Operation, per Resolução CMN 4.966 (docs/adr/0005). */
export type Stage = 1 | 2 | 3;

export interface LatePaymentFact {
  amountCents: Cents;
  dueDate: IsoDate;
  /** `null` while the Late Payment is open (not paid yet). */
  paidOn: IsoDate | null;
}

const DAY_MS = 86_400_000;

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Days past due: until payment, or until `asOf` while still open. */
export function daysLate(fact: LatePaymentFact, asOf: IsoDate): number {
  return Math.max(0, daysBetween(fact.dueDate, fact.paidOn ?? asOf));
}

export function stageFor(openDaysLate: number): Stage {
  if (openDaysLate > 90) return 3;
  if (openDaysLate > 30) return 2;
  return 1;
}

/** Stage from the oldest open Late Payment; paid ones no longer count. */
export function stageOf(facts: LatePaymentFact[], asOf: IsoDate): Stage {
  const open = facts.filter(fact => fact.paidOn === null && fact.dueDate <= asOf);
  return stageFor(Math.max(0, ...open.map(fact => daysLate(fact, asOf))));
}

export function overdueCents(facts: LatePaymentFact[], asOf: IsoDate): Cents {
  return facts
    .filter(fact => fact.paidOn === null && fact.dueDate <= asOf)
    .reduce((sum, fact) => sum + fact.amountCents, 0);
}

/** Late Payments already settled whose due date falls in the 12 months before `asOf`. */
export function settledInLastYear(facts: LatePaymentFact[], asOf: IsoDate): LatePaymentFact[] {
  const since = addDays(asOf, -365);
  return facts.filter(fact => fact.paidOn !== null && fact.dueDate > since && fact.dueDate <= asOf);
}
