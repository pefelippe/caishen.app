import { Decimal, toCents, type Cents } from './money';

/** A way to split the income: the 50/30/20 rule, 70/20/10, the AUVP's categories, or the User's. */
export type BudgetMethod = 'AUVP' | 'CUSTOM' | 'FIFTY_THIRTY_TWENTY' | 'SEVENTY_TWENTY_TEN';

/** One share of the income in a Budget, as a whole percentage. */
export interface BudgetSlice {
  key: string;
  label: string;
  percent: number;
}

/**
 * The slices each method starts with. The AUVP does not publish its percentages, so these are a
 * starting point to edit.
 */
export const BUDGET_METHODS: Record<Exclude<BudgetMethod, 'CUSTOM'>, BudgetSlice[]> = {
  AUVP: [
    { key: 'fixed', label: 'Custos fixos', percent: 40 },
    { key: 'comfort', label: 'Conforto', percent: 15 },
    { key: 'goals', label: 'Metas', percent: 15 },
    { key: 'pleasures', label: 'Prazeres', percent: 10 },
    { key: 'freedom', label: 'Liberdade financeira', percent: 15 },
    { key: 'knowledge', label: 'Conhecimento', percent: 5 },
  ],
  FIFTY_THIRTY_TWENTY: [
    { key: 'needs', label: 'Necessidades', percent: 50 },
    { key: 'wants', label: 'Desejos', percent: 30 },
    { key: 'goals', label: 'Objetivos', percent: 20 },
  ],
  SEVENTY_TWENTY_TEN: [
    { key: 'needs', label: 'Custo de vida', percent: 70 },
    { key: 'goals', label: 'Dívidas e reserva', percent: 20 },
    { key: 'wants', label: 'Desejos', percent: 10 },
  ],
};

/** Whoever has debts starts on 70/20/10, which puts a fifth towards them; the rest on 50/30/20. */
export const defaultBudgetMethod = (hasDebts: boolean): Exclude<BudgetMethod, 'CUSTOM'> =>
  hasDebts ? 'SEVENTY_TWENTY_TEN' : 'FIFTY_THIRTY_TWENTY';

/** Why a set of slices cannot be a Budget, in pt-BR; `null` when it can. */
export function budgetSlicesProblem(slices: BudgetSlice[]): string | null {
  if (slices.length < 2 || slices.length > 8) return 'Use de 2 a 8 fatias.';
  const keys = new Set(slices.map(slice => slice.key));
  if (keys.size !== slices.length) return 'Cada fatia precisa de um nome só dela.';
  for (const slice of slices) {
    if (!slice.key.trim() || !slice.label.trim()) return 'Dê um nome a cada fatia.';
    if (!Number.isInteger(slice.percent) || slice.percent < 0 || slice.percent > 100) {
      return 'Cada fatia vai de 0% a 100%, sem casas decimais.';
    }
  }
  const total = slices.reduce((sum, slice) => sum + slice.percent, 0);
  return total === 100 ? null : `As fatias somam ${total}%; precisam somar 100%.`;
}

/** Money that went out in a month under one category, and in how many lines. */
export interface CategorySpending {
  amountCents: Cents;
  category: string;
  count: number;
}

export interface SliceOutcome extends BudgetSlice {
  categories: string[];
  count: number;
  /** The slice's share of the income. */
  plannedCents: Cents;
  spentCents: Cents;
}

/**
 * A month against its Budget: each slice's share of `incomeCents`, what was spent in the
 * categories it holds, and the spending whose category no slice holds yet. A share is rounded to
 * cents on its own (docs/adr/0004).
 */
export function budgetOutcome(input: {
  /** Category → slice key. */
  categories: Record<string, string>;
  incomeCents: Cents;
  slices: BudgetSlice[];
  spending: CategorySpending[];
}): { slices: SliceOutcome[]; unassigned: CategorySpending[] } {
  const slices: SliceOutcome[] = input.slices.map(slice => ({
    ...slice,
    categories: [],
    count: 0,
    plannedCents: toCents(new Decimal(input.incomeCents).times(slice.percent).div(100)),
    spentCents: 0,
  }));
  const byKey = new Map(slices.map(slice => [slice.key, slice]));
  const unassigned: CategorySpending[] = [];
  for (const item of input.spending) {
    const slice = byKey.get(input.categories[item.category] ?? '');
    if (!slice) {
      unassigned.push(item);
      continue;
    }
    slice.spentCents += item.amountCents;
    slice.count += item.count;
    slice.categories.push(item.category);
  }
  return { slices, unassigned };
}
