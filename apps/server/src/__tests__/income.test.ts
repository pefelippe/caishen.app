import { closeDb, db, schema } from '@zapbots/database';
import { foreignToBrlCents } from '@zapbots/finance';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { ptaxHandler } from '../../test/msw/bacen';
import { mswServer } from '../../test/msw/openrouter';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const MONTH = /* GraphQL */ `
  query ($id: ID!, $month: String!) {
    holder(id: $id) {
      month(month: $month) {
        incomeCents
        incomes {
          date
          amountCents
          foreign {
            amountCents
            currency
            rate
            rateDate
            rateSource
          }
        }
      }
    }
  }
`;
const SET_RATE = /* GraphQL */ `
  mutation ($incomeSourceId: ID!, $date: Date!, $rate: Float) {
    setIncomeRate(incomeSourceId: $incomeSourceId, date: $date, rate: $rate)
  }
`;

describe('a salary paid in dollars', () => {
  it('pays each payday its part at the PTAX of the last business day, less IOF and spread', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [source] = await db
      .insert(schema.incomeSource)
      .values({
        currency: 'USD',
        description: 'Salário Acme',
        holderId: holder.id,
        monthlyNetCents: 500_000,
        paydays: [15, 30],
        spreadRate: '0.01',
        startsOn: '2025-10-01',
      })
      .returning();
    // 15/11/2025 is a Saturday: its rate is Friday's.
    const { handler } = ptaxHandler({ '2025-11-14': 5.3, '2025-11-28': 5.35 });
    mswServer.use(handler);

    const month = (await gql(viewer, MONTH, { id: holder.id, month: '2025-11' })).data.holder.month;
    const first = foreignToBrlCents(250_000, '5.3', { spread: '0.01' });
    const second = foreignToBrlCents(250_000, '5.35', { spread: '0.01' });
    expect(month.incomes).toEqual([
      {
        amountCents: first,
        date: '2025-11-15',
        foreign: {
          amountCents: 250_000,
          currency: 'USD',
          rate: 5.3,
          rateDate: '2025-11-14',
          rateSource: 'PTAX',
        },
      },
      {
        amountCents: second,
        date: '2025-11-30',
        foreign: {
          amountCents: 250_000,
          currency: 'USD',
          rate: 5.35,
          rateDate: '2025-11-28',
          rateSource: 'PTAX',
        },
      },
    ]);
    expect(month.incomeCents).toBe(first + second);

    // The rate the bank really gave on the 30th replaces the PTAX for that payment only.
    expect(
      (await gql(viewer, SET_RATE, { date: '2025-11-30', incomeSourceId: source!.id, rate: 5.5 }))
        .errors
    ).toEqual([]);
    const corrected = (await gql(viewer, MONTH, { id: holder.id, month: '2025-11' })).data.holder
      .month;
    expect(corrected.incomes[1]).toMatchObject({
      amountCents: foreignToBrlCents(250_000, '5.5', { spread: '0.01' }),
      foreign: { rate: 5.5, rateSource: 'INFORMED' },
    });
    expect(corrected.incomes[0].foreign.rateSource).toBe('PTAX');
  });

  it('starts on its first month and keeps others out of its rates', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const [source] = await db
      .insert(schema.incomeSource)
      .values({
        currency: 'USD',
        description: 'Salário Acme',
        holderId: holder.id,
        monthlyNetCents: 250_000,
        paydays: [15],
        startsOn: '2025-11-01',
      })
      .returning();
    const { handler } = ptaxHandler({ '2025-10-15': 5.2 });
    mswServer.use(handler);

    const october = (await gql(viewer, MONTH, { id: holder.id, month: '2025-10' })).data.holder
      .month;
    expect(october.incomes).toEqual([]);

    expect(
      (await gql(stranger, SET_RATE, { date: '2025-11-15', incomeSourceId: source!.id, rate: 1 }))
        .errors
    ).toEqual(['NOT_FOUND']);
  });
});
