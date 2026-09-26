import { describe, expect, it } from 'vitest';

import { priceInstallment } from '../amortization';
import { ImpliedRateError, impliedMonthlyRate } from '../impliedRate';

describe('impliedMonthlyRate', () => {
  it('recovers the Price rate from the installment', () => {
    const rate = impliedMonthlyRate('PRICE', 1_000_000, 88_849, 12);
    expect(rate.toNumber()).toBeCloseTo(0.01, 5);
  });

  it('round-trips a realistic vehicle financing (R$ 80.000, 1,89% a.m., 48x)', () => {
    const installment = priceInstallment(8_000_000, '0.0189', 48);
    expect(impliedMonthlyRate('PRICE', 8_000_000, installment, 48).toNumber()).toBeCloseTo(
      0.0189,
      5
    );
  });

  it('is zero when installments sum exactly to the principal', () => {
    expect(impliedMonthlyRate('PRICE', 1_200_000, 100_000, 12).toNumber()).toBe(0);
  });

  it('rejects installments that do not cover the principal', () => {
    expect(() => impliedMonthlyRate('PRICE', 1_200_000, 90_000, 12)).toThrow(ImpliedRateError);
  });

  it('derives the SAC rate from the first installment', () => {
    expect(impliedMonthlyRate('SAC', 1_200_000, 112_000, 12).toNumber()).toBeCloseTo(0.01, 10);
  });
});
