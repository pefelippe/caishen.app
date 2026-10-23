import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const PERIOD = /* GraphQL */ `
  query ($id: ID!, $from: Date!, $to: Date!) {
    holder(id: $id) {
      period(from: $from, to: $to) {
        month
        commitmentsCents
        expensesCents
        balanceCents
        commitments {
          date
        }
        expenses {
          date
          description
        }
      }
    }
  }
`;

describe('Período', () => {
  it('joins the months it touches and keeps only the lines inside it', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    await gql(
      viewer,
      /* GraphQL */ `
        mutation ($input: RecurringExpenseInput!) {
          addRecurringExpense(input: $input) {
            id
          }
        }
      `,
      { input: { amountCents: 10_000, description: 'Academia', dueDay: 5, holderId: holder.id } }
    );
    for (const [date, description] of [
      ['2026-08-31', 'Antes'],
      ['2026-09-15', 'Mercado'],
      ['2026-10-20', 'Farmácia'],
      ['2026-11-01', 'Depois'],
    ]) {
      await gql(
        viewer,
        /* GraphQL */ `
          mutation ($input: ExpenseInput!) {
            addExpense(input: $input) {
              id
            }
          }
        `,
        { input: { amountCents: 2_500, date, description, holderId: holder.id } }
      );
    }

    const result = await gql(viewer, PERIOD, {
      from: '2026-09-01',
      id: holder.id,
      to: '2026-10-31',
    });
    expect(result.errors).toEqual([]);
    const period = result.data.holder.period;
    expect(period.month).toBe('2026-09-01..2026-10-31');
    expect(period.expenses.map((item: { description: string }) => item.description)).toEqual([
      'Mercado',
      'Farmácia',
    ]);
    expect(period.commitments).toEqual([{ date: '2026-09-05' }, { date: '2026-10-05' }]);
    expect(period.commitmentsCents).toBe(20_000);
    expect(period.expensesCents).toBe(5_000);
    expect(period.balanceCents).toBe(-25_000);

    // A span inside one month cuts that month too.
    const days = (
      await gql(viewer, PERIOD, { from: '2026-10-06', id: holder.id, to: '2026-10-20' })
    ).data.holder.period;
    expect(days.commitments).toEqual([]);
    expect(days.expensesCents).toBe(2_500);
  });

  it('refuses a period backwards or longer than two years', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const backwards = await gql(viewer, PERIOD, {
      from: '2026-10-31',
      id: holder.id,
      to: '2026-10-01',
    });
    expect(backwards.errors).toEqual(['BAD_USER_INPUT']);
    const long = await gql(viewer, PERIOD, { from: '2023-01-01', id: holder.id, to: '2026-10-31' });
    expect(long.errors).toEqual(['BAD_USER_INPUT']);
  });
});
