import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const BUDGET = /* GraphQL */ `
  query ($id: ID!) {
    holder(id: $id) {
      budget(month: "2026-10") {
        method
        saved
        incomeCents
        slices {
          key
          plannedCents
          spentCents
          count
        }
        unassigned {
          name
          amountCents
        }
      }
    }
  }
`;
const SAVE = /* GraphQL */ `
  mutation ($input: BudgetInput!) {
    saveBudget(input: $input) {
      id
    }
  }
`;

/** A Viewer earning R$ 5.000,00 in October 2026, who spent on groceries, fun and a gift. */
async function viewerWithMonth() {
  const viewer = await createViewer();
  const holder = await viewerHolder(viewer);
  await db.insert(schema.incomeSource).values({
    description: 'Salário',
    holderId: holder.id,
    monthlyNetCents: 500_000,
    paydays: [5],
    startsOn: '2026-01-01',
  });
  const spent = (description: string, category: string, amountCents: number) => ({
    amountCents,
    category,
    date: '2026-10-10',
    description,
    holderId: holder.id,
    organizationId: viewer.organizationId,
  });
  await db
    .insert(schema.expense)
    .values([
      spent('Supermercado', 'Mercado', 80_000),
      spent('Feira', 'Mercado', 20_000),
      spent('Cinema', 'Lazer', 15_000),
      spent('Presente', 'Presentes', 9_000),
    ]);
  return { holder, viewer };
}

const budgetOf = async (viewer: Viewer, id: string) =>
  (await gql(viewer, BUDGET, { id })).data.holder.budget;

describe('Orçamento', () => {
  it('starts on 50/30/20 without debts, with every category still to place', async () => {
    const { holder, viewer } = await viewerWithMonth();

    const budget = await budgetOf(viewer, holder.id);

    expect(budget).toMatchObject({
      incomeCents: 500_000,
      method: 'FIFTY_THIRTY_TWENTY',
      saved: false,
    });
    expect(budget.slices.map((slice: { plannedCents: number }) => slice.plannedCents)).toEqual([
      250_000, 150_000, 100_000,
    ]);
    expect(budget.unassigned).toEqual([
      { amountCents: 100_000, name: 'Mercado' },
      { amountCents: 15_000, name: 'Lazer' },
      { amountCents: 9_000, name: 'Presentes' },
    ]);
  });

  it('adds up each slice once the categories are placed', async () => {
    const { holder, viewer } = await viewerWithMonth();

    const saved = await gql(viewer, SAVE, {
      input: {
        categories: [
          { name: 'Mercado', sliceKey: 'needs' },
          { name: 'Lazer', sliceKey: 'wants' },
          { name: 'Presentes', sliceKey: 'wants' },
        ],
        holderId: holder.id,
        method: 'CUSTOM',
        slices: [
          { key: 'needs', label: 'Essencial', percent: 60 },
          { key: 'wants', label: 'Livre', percent: 40 },
        ],
      },
    });
    expect(saved.errors).toEqual([]);

    const budget = await budgetOf(viewer, holder.id);
    expect(budget).toMatchObject({ method: 'CUSTOM', saved: true, unassigned: [] });
    expect(budget.slices).toEqual([
      { count: 2, key: 'needs', plannedCents: 300_000, spentCents: 100_000 },
      { count: 2, key: 'wants', plannedCents: 200_000, spentCents: 24_000 },
    ]);
  });

  it('refuses slices that do not add up to 100% and categories sent to no slice', async () => {
    const { holder, viewer } = await viewerWithMonth();
    const input = (slices: unknown[], categories: unknown[] = []) => ({
      input: { categories, holderId: holder.id, method: 'CUSTOM', slices },
    });

    expect(
      (
        await gql(
          viewer,
          SAVE,
          input([
            { key: 'a', label: 'A', percent: 90 },
            { key: 'b', label: 'B', percent: 5 },
          ])
        )
      ).errors
    ).toEqual(['BAD_USER_INPUT']);
    expect(
      (
        await gql(
          viewer,
          SAVE,
          input(
            [
              { key: 'a', label: 'A', percent: 50 },
              { key: 'b', label: 'B', percent: 50 },
            ],
            [{ name: 'Mercado', sliceKey: 'z' }]
          )
        )
      ).errors
    ).toEqual(['BAD_USER_INPUT']);
    expect((await budgetOf(viewer, holder.id)).saved).toBe(false);
  });

  it('keeps each Organization to its own Holder', async () => {
    const { holder } = await viewerWithMonth();
    const stranger = await createViewer('Bia');

    const result = await gql(stranger, SAVE, {
      input: {
        categories: [],
        holderId: holder.id,
        method: 'FIFTY_THIRTY_TWENTY',
        slices: [
          { key: 'a', label: 'A', percent: 50 },
          { key: 'b', label: 'B', percent: 50 },
        ],
      },
    });
    expect(result.errors).toEqual(['NOT_FOUND']);
  });
});
