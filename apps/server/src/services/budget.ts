import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import {
  BUDGET_METHODS,
  budgetOutcome,
  budgetSlicesProblem,
  defaultBudgetMethod,
  type BudgetMethod,
  type BudgetSlice,
  type CategorySpending,
} from '@zapbots/finance';
import { eq, inArray } from 'drizzle-orm';

import { badInput, findHolder } from '../resolvers/guards';
import { monthStatement } from './month';

/** Names for spending that has no category of its own, so it can be put in a slice too. */
export const PSEUDO_CATEGORIES = {
  COMPANY_TAX: 'Impostos',
  EXPENSE: 'Sem categoria',
  INSTALLMENT: 'Parcelas',
  RECURRING: 'Gastos recorrentes',
  STATEMENT: 'Faturas',
  TAX: 'Impostos',
} as const;

/** The month's spending by category: Gastos, Gastos recorrentes and what falls due. */
async function spendingOf(holderId: string, month: string) {
  const statement = await monthStatement(holderId, month);
  const recurringIds = statement.commitments
    .filter(line => line.kind === 'RECURRING' && line.id)
    .map(line => line.id!);
  const recurring = recurringIds.length
    ? await db
        .select({ category: schema.recurringExpense.category, id: schema.recurringExpense.id })
        .from(schema.recurringExpense)
        .where(inArray(schema.recurringExpense.id, recurringIds))
    : [];
  const categoryOf = new Map(recurring.map(item => [item.id, item.category]));

  const totals = new Map<string, CategorySpending>();
  const add = (category: string, amountCents: number) => {
    const entry = totals.get(category) ?? { amountCents: 0, category, count: 0 };
    entry.amountCents += amountCents;
    entry.count += 1;
    totals.set(category, entry);
  };
  for (const line of statement.commitments) {
    if (line.kind === 'RECURRING') {
      add(
        (line.id && categoryOf.get(line.id)?.trim()) || PSEUDO_CATEGORIES.RECURRING,
        line.amountCents
      );
    } else if (line.kind in PSEUDO_CATEGORIES) {
      add(PSEUDO_CATEGORIES[line.kind as keyof typeof PSEUDO_CATEGORIES], line.amountCents);
    }
  }
  for (const expense of statement.expenses) {
    add(expense.category?.trim() || PSEUDO_CATEGORIES.EXPENSE, expense.amountCents);
  }
  const spending = [...totals.values()].sort((a, b) => b.amountCents - a.amountCents);
  return { incomeCents: statement.incomeCents, spending };
}

/**
 * A Holder's month against their Orçamento. Without a saved one, the method comes from the data
 * (debts → 70/20/10) and what falls due by itself (Parcelas, Faturas, Impostos) goes to the first
 * slice, the one for living costs.
 */
export async function budgetFor(holderId: string, month: string) {
  const [saved] = await db.select().from(schema.budget).where(eq(schema.budget.holderId, holderId));
  const [debt] = saved
    ? []
    : await db
        .select({ id: schema.creditOperation.id })
        .from(schema.creditOperation)
        .where(eq(schema.creditOperation.holderId, holderId))
        .limit(1);
  const method: BudgetMethod = saved?.method ?? defaultBudgetMethod(Boolean(debt));
  const slices: BudgetSlice[] =
    saved?.slices ?? BUDGET_METHODS[method as Exclude<BudgetMethod, 'CUSTOM'>];
  const categories: Record<string, string> = saved?.categories ?? {
    [PSEUDO_CATEGORIES.INSTALLMENT]: slices[0]!.key,
    [PSEUDO_CATEGORIES.STATEMENT]: slices[0]!.key,
    [PSEUDO_CATEGORIES.TAX]: slices[0]!.key,
  };

  const { incomeCents, spending } = await spendingOf(holderId, month);
  const outcome = budgetOutcome({ categories, incomeCents, slices, spending });
  // Every category the User can place: what was spent this month and what was placed before.
  const names = new Set([...spending.map(item => item.category), ...Object.keys(categories)]);
  return {
    categories: [...names]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map(name => ({
        amountCents: spending.find(item => item.category === name)?.amountCents ?? 0,
        count: spending.find(item => item.category === name)?.count ?? 0,
        name,
        sliceKey: categories[name] ?? null,
      })),
    incomeCents,
    method,
    month,
    saved: Boolean(saved),
    slices: outcome.slices,
    unassigned: outcome.unassigned.map(item => ({ ...item, name: item.category, sliceKey: null })),
  };
}

/** Saves the Viewer's Holder's Orçamento: the method, its slices and where each category goes. */
export async function saveBudget(
  viewer: Viewer,
  input: {
    categories: { name: string; sliceKey: string }[];
    holderId: string;
    method: BudgetMethod;
    slices: BudgetSlice[];
  }
) {
  const holder = await findHolder(viewer, input.holderId);
  const slices = input.slices.map(slice => ({
    key: slice.key.trim(),
    label: slice.label.trim().slice(0, 40),
    percent: slice.percent,
  }));
  const problem = budgetSlicesProblem(slices);
  if (problem) badInput(problem);
  const keys = new Set(slices.map(slice => slice.key));
  const categories: Record<string, string> = {};
  for (const item of input.categories.slice(0, 200)) {
    const name = item.name.trim().slice(0, 60);
    if (!name) continue;
    if (!keys.has(item.sliceKey)) badInput(`"${name}" vai para uma fatia que não existe.`);
    categories[name] = item.sliceKey;
  }
  const values = { categories, method: input.method, slices };
  await db
    .insert(schema.budget)
    .values({ ...values, holderId: holder.id, organizationId: viewer.organizationId })
    .onConflictDoUpdate({ set: values, target: schema.budget.holderId });
  return holder;
}
