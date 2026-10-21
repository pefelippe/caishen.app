import { describe, expect, it } from 'vitest';

import { taxDueInMonth } from '../taxes';

describe('taxDueInMonth', () => {
  it('charges a monthly Imposto every month on its day', () => {
    const das = {
      amountCents: 7660,
      dueDay: 20,
      dueMonth: null,
      frequency: 'MONTHLY' as const,
      installments: 1,
    };
    expect(taxDueInMonth(das, '2026-02')).toEqual({
      amountCents: 7660,
      dueDate: '2026-02-20',
      installment: 1,
    });
  });

  it('splits a yearly Imposto in whole cents that add up to the year', () => {
    const ipva = {
      amountCents: 100000,
      dueDay: 31,
      dueMonth: 1,
      frequency: 'YEARLY' as const,
      installments: 3,
    };
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'].map(month =>
      taxDueInMonth(ipva, month)
    );
    expect(months).toEqual([
      { amountCents: 33334, dueDate: '2026-01-31', installment: 1 },
      { amountCents: 33333, dueDate: '2026-02-28', installment: 2 },
      { amountCents: 33333, dueDate: '2026-03-31', installment: 3 },
      null,
    ]);
  });

  it('runs installments past December into the next year', () => {
    const iptu = {
      amountCents: 120000,
      dueDay: 10,
      dueMonth: 11,
      frequency: 'YEARLY' as const,
      installments: 4,
    };
    expect(taxDueInMonth(iptu, '2027-02')).toEqual({
      amountCents: 30000,
      dueDate: '2027-02-10',
      installment: 4,
    });
    expect(taxDueInMonth(iptu, '2026-10')).toBeNull();
  });
});
