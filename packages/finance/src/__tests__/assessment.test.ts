import { describe, expect, it } from 'vitest';

import { AssessmentError, assess, riskBand, type AssessmentInput } from '../assessment';

const base: AssessmentInput = {
  asOf: '2026-09-26',
  dueNext30DaysCents: 0,
  latePayments: [],
  monthlyIncomeCents: 1_000_000,
  openStatementsCents: 0,
  outstandingDebtCents: 0,
  totalCardLimitCents: 0,
};

describe('riskBand', () => {
  it('uses the SPC cut-offs', () => {
    expect(riskBand(0)).toBe('HIGH');
    expect(riskBand(300)).toBe('HIGH');
    expect(riskBand(301)).toBe('MEDIUM');
    expect(riskBand(700)).toBe('MEDIUM');
    expect(riskBand(701)).toBe('LOW');
    expect(riskBand(1000)).toBe('LOW');
  });
});

describe('assess', () => {
  it('scores a punctual, lightly indebted profile 1000', () => {
    const result = assess({
      ...base,
      dueNext30DaysCents: 200_000,
      openStatementsCents: 100_000,
      outstandingDebtCents: 1_900_000,
      totalCardLimitCents: 1_000_000,
    });
    expect(result.score).toBe(1000);
    expect(result.band).toBe('LOW');
    expect(result.indicators.incomeCommitment).toBe(0.2);
    expect(result.indicators.debtToIncome).toBe(2);
    expect(result.indicators.creditUtilization).toBe(0.1);
    expect(result.indicators.paymentCapacityCents).toBe(800_000);
    expect(result.indicators.suggestedLimitCents).toBe(300_000);
    expect(result.indicators.worstStage).toBe(1);
  });

  it('keeps an overcommitted but punctual profile out of low risk', () => {
    // Figures from a real bureau report: R$ 16.074 income, R$ 17.188 due in 30 days,
    // R$ 139.104 outstanding in the SCR, no late payments. The report graded it AA.
    const result = assess({
      ...base,
      dueNext30DaysCents: 1_718_800,
      monthlyIncomeCents: 1_607_400,
      outstandingDebtCents: 13_910_400,
    });
    expect(result.indicators.incomeCommitment).toBeCloseTo(1.069, 3);
    expect(result.indicators.paymentCapacityCents).toBe(0);
    expect(result.breakdown).toEqual({ capacity: 70, punctuality: 500, utilization: 200 });
    expect(result.score).toBe(700);
    expect(result.band).toBe('MEDIUM');
  });

  it('puts an operation more than 90 days late in Stage 3 and high risk', () => {
    const result = assess({
      ...base,
      latePayments: [{ amountCents: 50_000, dueDate: '2026-05-10', paidOn: null }],
    });
    expect(result.indicators.worstStage).toBe(3);
    expect(result.indicators.overdueCents).toBe(50_000);
    expect(result.score).toBeLessThanOrEqual(300);
    expect(result.band).toBe('HIGH');
  });

  it('moves to Stage 2 between 31 and 90 days late', () => {
    const result = assess({
      ...base,
      latePayments: [{ amountCents: 50_000, dueDate: '2026-08-10', paidOn: null }],
    });
    expect(result.indicators.worstStage).toBe(2);
    expect(result.breakdown.punctuality).toBe(200);
  });

  it('counts overdue installments as committed income', () => {
    const result = assess({
      ...base,
      latePayments: [{ amountCents: 300_000, dueDate: '2026-09-20', paidOn: null }],
    });
    expect(result.indicators.worstStage).toBe(1);
    expect(result.indicators.incomeCommitment).toBe(0.3);
    expect(result.breakdown.punctuality).toBe(400);
  });

  it('remembers late payments settled in the last 12 months, not older ones', () => {
    const result = assess({
      ...base,
      latePayments: [
        { amountCents: 10_000, dueDate: '2026-03-10', paidOn: '2026-03-20' },
        { amountCents: 10_000, dueDate: '2026-04-10', paidOn: '2026-06-10' },
        { amountCents: 10_000, dueDate: '2025-01-10', paidOn: '2025-03-10' },
      ],
    });
    expect(result.indicators.lateLast12Months).toBe(2);
    expect(result.indicators.worstStage).toBe(1);
    expect(result.breakdown.punctuality).toBe(500 - 50 - 100);
  });

  it('requires income', () => {
    expect(() => assess({ ...base, monthlyIncomeCents: 0 })).toThrow(AssessmentError);
  });
});
