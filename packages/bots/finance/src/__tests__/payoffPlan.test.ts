import { describe, expect, it } from 'vitest';

import { amortizationSchedule } from '../amortization';
import { payoffOutlook } from '../payoff';
import { avalanchePlan } from '../payoffPlan';

const debt = (id: string, monthlyRate: string, principalCents: number, termMonths: number) => ({
  id,
  input: {
    firstDueDate: '2026-11-10',
    monthlyRate,
    principalCents,
    system: 'PRICE' as const,
    termMonths,
  },
});

const cheap = debt('cheap', '0.01', 2_000_000, 36);
const dear = debt('dear', '0.04', 500_000, 24);

describe('avalanchePlan', () => {
  it('pays off the dearest Operation first and saves interest overall', () => {
    const plan = avalanchePlan([cheap, dear], '2026-10-17', 100_000);

    expect(plan.payoffs.map(payoff => payoff.id)).toEqual(['dear', 'cheap']);
    expect(plan.debtFreeOn! < plan.debtFreeWithoutPlanOn!).toBe(true);
    expect(plan.debtFreeWithoutPlanOn).toBe('2029-10-10');
    expect(plan.interestSavedCents).toBeGreaterThan(0);
  });

  it('saves more with a larger monthly amount', () => {
    const small = avalanchePlan([cheap, dear], '2026-10-17', 50_000);
    const large = avalanchePlan([cheap, dear], '2026-10-17', 200_000);
    expect(large.interestSavedCents).toBeGreaterThan(small.interestSavedCents);
    expect(large.debtFreeOn! <= small.debtFreeOn!).toBe(true);
  });

  it('cannot save more interest than is left to pay', () => {
    const plan = avalanchePlan([cheap, dear], '2026-10-17', 99_000_000);
    const left = [cheap, dear].reduce(
      (sum, item) =>
        sum + payoffOutlook(amortizationSchedule(item.input), '2026-10-17').remainingInterestCents,
      0
    );
    expect(plan.interestSavedCents).toBeLessThanOrEqual(left);
    // Everything is settled after the first installments, in the first month.
    expect(plan.debtFreeOn).toBe('2026-11-10');
  });

  it('has nothing to plan without debts, and refuses a non-positive amount', () => {
    expect(avalanchePlan([], '2026-10-17', 100_000)).toEqual({
      debtFreeOn: null,
      debtFreeWithoutPlanOn: null,
      interestSavedCents: 0,
      payoffs: [],
    });
    expect(() => avalanchePlan([cheap], '2026-10-17', 0)).toThrow();
  });
});
