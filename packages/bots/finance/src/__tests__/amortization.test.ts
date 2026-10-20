import { describe, expect, it } from 'vitest';

import {
  amortizationSchedule,
  dueWithin,
  outstandingBalance,
  priceInstallment,
  sacFirstInstallment,
} from '../amortization';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('Price', () => {
  const input = {
    firstDueDate: '2026-01-10',
    monthlyRate: '0.01',
    principalCents: 1_000_000,
    system: 'PRICE' as const,
    termMonths: 12,
  };

  it('computes the textbook installment (R$ 10.000, 1% a.m., 12x = R$ 888,49)', () => {
    expect(priceInstallment(1_000_000, '0.01', 12)).toBe(88_849);
  });

  it('keeps the installment constant and amortizes the whole principal', () => {
    const rows = amortizationSchedule(input);
    expect(rows).toHaveLength(12);
    expect(rows.slice(0, -1).every(row => row.installmentCents === 88_849)).toBe(true);
    expect(Math.abs(rows.at(-1)!.installmentCents - 88_849)).toBeLessThanOrEqual(2);
    expect(sum(rows.map(row => row.amortizationCents))).toBe(1_000_000);
    expect(rows.at(-1)!.balanceCents).toBe(0);
  });

  it('charges interest on the running balance', () => {
    const [first, second] = amortizationSchedule(input);
    expect(first!.interestCents).toBe(10_000);
    expect(second!.interestCents).toBe(Math.round(first!.balanceCents * 0.01));
  });

  it('handles a zero rate', () => {
    const rows = amortizationSchedule({ ...input, monthlyRate: 0 });
    expect(rows.every(row => row.interestCents === 0)).toBe(true);
    expect(sum(rows.map(row => row.installmentCents))).toBe(1_000_000);
  });

  it('clamps due dates to the end of short months', () => {
    const rows = amortizationSchedule({ ...input, firstDueDate: '2026-01-31' });
    expect(rows[1]!.dueDate).toBe('2026-02-28');
    expect(rows[2]!.dueDate).toBe('2026-03-31');
  });

  it('shortens the term after an Extra Amortization', () => {
    const rows = amortizationSchedule({
      ...input,
      extraAmortizations: [{ amountCents: 300_000, date: '2026-02-05' }],
    });
    expect(rows[1]!.extraAmortizationCents).toBe(300_000);
    expect(rows.length).toBeLessThan(12);
    expect(rows.at(-1)!.balanceCents).toBe(0);
    const totalPrincipal = sum(rows.map(row => row.amortizationCents + row.extraAmortizationCents));
    expect(totalPrincipal).toBe(1_000_000);
  });
});

describe('SAC', () => {
  const rows = amortizationSchedule({
    firstDueDate: '2026-01-10',
    monthlyRate: '0.01',
    principalCents: 1_200_000,
    system: 'SAC',
    termMonths: 12,
  });

  it('keeps amortization constant and installments decreasing', () => {
    expect(rows.every(row => row.amortizationCents === 100_000)).toBe(true);
    expect(rows[0]!.installmentCents).toBe(112_000);
    expect(rows.at(-1)!.installmentCents).toBe(101_000);
    expect(sacFirstInstallment(1_200_000, '0.01', 12)).toBe(112_000);
  });
});

describe('Outstanding Balance and upcoming installments', () => {
  const rows = amortizationSchedule({
    firstDueDate: '2026-01-10',
    monthlyRate: '0.01',
    principalCents: 1_000_000,
    system: 'PRICE',
    termMonths: 12,
  });

  it('is the full principal before the first due date', () => {
    expect(outstandingBalance(rows, 1_000_000, '2026-01-09')).toBe(1_000_000);
  });

  it('presumes installments due up to the date were paid', () => {
    expect(outstandingBalance(rows, 1_000_000, '2026-03-10')).toBe(rows[2]!.balanceCents);
    expect(outstandingBalance(rows, 1_000_000, '2027-06-01')).toBe(0);
  });

  it('sums installments due in the next 30 days, excluding today', () => {
    expect(dueWithin(rows, '2026-01-10', 30)).toBe(0);
    expect(dueWithin(rows, '2026-01-11', 30)).toBe(rows[1]!.installmentCents);
  });
});
