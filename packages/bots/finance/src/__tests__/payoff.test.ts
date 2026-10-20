import { describe, expect, it } from 'vitest';

import { amortizationSchedule } from '../amortization';
import { payoffOutlook, prepaymentEffect } from '../payoff';

const loan = {
  firstDueDate: '2026-01-10',
  monthlyRate: '0.02',
  principalCents: 1_200_000,
  system: 'PRICE' as const,
  termMonths: 12,
};

describe('payoffOutlook', () => {
  it('counts only the installments due after the date', () => {
    const schedule = amortizationSchedule(loan);
    const outlook = payoffOutlook(schedule, '2026-03-10');
    const ahead = schedule.slice(3);
    expect(outlook).toEqual({
      lastDueDate: '2026-12-10',
      remainingInstallments: 9,
      remainingInterestCents: ahead.reduce((sum, row) => sum + row.interestCents, 0),
    });
  });

  it('is empty once the schedule is over', () => {
    expect(payoffOutlook(amortizationSchedule(loan), '2027-01-01')).toEqual({
      lastDueDate: null,
      remainingInstallments: 0,
      remainingInterestCents: 0,
    });
  });
});

describe('prepaymentEffect', () => {
  it('saves interest and installments, more for a larger amount', () => {
    const small = prepaymentEffect(loan, '2026-03-15', 100_000);
    const large = prepaymentEffect(loan, '2026-03-15', 500_000);
    expect(small.interestSavedCents).toBeGreaterThan(0);
    expect(small.installmentsSaved).toBeGreaterThanOrEqual(1);
    expect(large.interestSavedCents).toBeGreaterThan(small.interestSavedCents);
    expect(large.installmentsSaved).toBeGreaterThan(small.installmentsSaved);
  });

  it('caps the amount at the balance: only the next installment is left to pay', () => {
    const schedule = amortizationSchedule(loan);
    const outlook = payoffOutlook(schedule, '2026-03-15');
    // The next installment (April) is still paid; the Extra Amortization settles the rest after it.
    const april = schedule.find(row => row.dueDate === '2026-04-10')!;
    expect(prepaymentEffect(loan, '2026-03-15', 99_000_000)).toEqual({
      installmentsSaved: outlook.remainingInstallments - 1,
      interestSavedCents: outlook.remainingInterestCents - april.interestCents,
    });
  });

  it('refuses a non-positive amount', () => {
    expect(() => prepaymentEffect(loan, '2026-03-15', 0)).toThrow();
  });
});
