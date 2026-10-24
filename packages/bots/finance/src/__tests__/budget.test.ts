import { describe, expect, it } from 'vitest';

import { BUDGET_METHODS, budgetOutcome, budgetSlicesProblem, defaultBudgetMethod } from '../budget';

describe('budget methods', () => {
  it('each start with slices that add up to 100%', () => {
    for (const slices of Object.values(BUDGET_METHODS)) {
      expect(budgetSlicesProblem(slices)).toBeNull();
    }
  });

  it('start whoever has debts on 70/20/10', () => {
    expect(defaultBudgetMethod(true)).toBe('SEVENTY_TWENTY_TEN');
    expect(defaultBudgetMethod(false)).toBe('FIFTY_THIRTY_TWENTY');
  });
});

describe('budgetSlicesProblem', () => {
  const slice = (key: string, percent: number) => ({ key, label: key, percent });

  it('wants the slices to add up to 100%', () => {
    expect(budgetSlicesProblem([slice('a', 40), slice('b', 30), slice('c', 20)])).toBe(
      'As fatias somam 90%; precisam somar 100%.'
    );
  });

  it('refuses repeated keys, fractions and a single slice', () => {
    expect(budgetSlicesProblem([slice('a', 50), slice('a', 50)])).toMatch(/só dela/);
    expect(budgetSlicesProblem([slice('a', 50.5), slice('b', 49.5)])).toMatch(/casas decimais/);
    expect(budgetSlicesProblem([slice('a', 100)])).toMatch(/de 2 a 8/);
  });
});

describe('budgetOutcome', () => {
  it('splits the income and adds up each slice, leaving unknown categories apart', () => {
    const { slices, unassigned } = budgetOutcome({
      categories: { Lazer: 'wants', Mercado: 'needs', Parcelas: 'needs' },
      incomeCents: 1_000_001,
      slices: BUDGET_METHODS.FIFTY_THIRTY_TWENTY,
      spending: [
        { amountCents: 120_000, category: 'Mercado', count: 4 },
        { amountCents: 80_000, category: 'Parcelas', count: 1 },
        { amountCents: 35_000, category: 'Lazer', count: 2 },
        { amountCents: 9_990, category: 'Presentes', count: 1 },
      ],
    });

    expect(
      slices.map(({ count, key, plannedCents, spentCents }) => [
        key,
        plannedCents,
        spentCents,
        count,
      ])
    ).toEqual([
      ['needs', 500_001, 200_000, 5],
      ['wants', 300_000, 35_000, 2],
      ['goals', 200_000, 0, 0],
    ]);
    expect(slices[0]!.categories).toEqual(['Mercado', 'Parcelas']);
    expect(unassigned).toEqual([{ amountCents: 9_990, category: 'Presentes', count: 1 }]);
  });
});
