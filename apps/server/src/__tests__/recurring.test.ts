import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const ADD = /* GraphQL */ `
  mutation ($input: RecurringExpenseInput!) {
    addRecurringExpense(input: $input) {
      id
    }
  }
`;
const MONTH = /* GraphQL */ `
  query ($id: ID!, $month: String!) {
    holder(id: $id) {
      month(month: $month) {
        commitmentsCents
        commitments {
          kind
          label
          amountCents
          date
        }
        onCard {
          label
          amountCents
        }
      }
    }
  }
`;

describe('Gastos recorrentes', () => {
  it('count in the month, except those on a Cartão, which its Fatura counts', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [card] = await db
      .insert(schema.creditCard)
      .values({
        closingDay: 1,
        dueDay: 10,
        holderId: holder.id,
        limitCents: 500_000,
        name: 'Visa',
        organizationId: viewer.organizationId,
      })
      .returning();

    const gym = await gql(viewer, ADD, {
      input: {
        amountCents: 12_990,
        description: 'Academia',
        dueDay: 5,
        holderId: holder.id,
        paymentMethod: 'PIX',
      },
    });
    expect(gym.errors).toEqual([]);
    await gql(viewer, ADD, {
      input: {
        amountCents: 5_590,
        creditCardId: card!.id,
        description: 'Netflix',
        dueDay: 10,
        holderId: holder.id,
        paymentMethod: 'CARD',
      },
    });
    await gql(viewer, ADD, {
      input: {
        amountCents: 458_000,
        cycle: 'YEARLY',
        description: 'Seguro do carro',
        dueDay: 5,
        dueMonth: 11,
        holderId: holder.id,
      },
    });

    const november = (await gql(viewer, MONTH, { id: holder.id, month: '2026-11' })).data.holder
      .month;
    expect(november.commitments).toEqual(
      expect.arrayContaining([
        { amountCents: 12_990, date: '2026-11-05', kind: 'RECURRING', label: 'Academia' },
        { amountCents: 458_000, date: '2026-11-05', kind: 'RECURRING', label: 'Seguro do carro' },
      ])
    );
    expect(november.onCard).toEqual([{ amountCents: 5_590, label: 'Netflix' }]);
    expect(november.commitmentsCents).toBe(12_990 + 458_000);

    const december = (await gql(viewer, MONTH, { id: holder.id, month: '2026-12' })).data.holder
      .month;
    expect(december.commitmentsCents).toBe(12_990);
  });

  it('refuses a yearly one without its month, and a Cartão of someone else', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const strangerHolder = await viewerHolder(stranger);
    const [theirCard] = await db
      .insert(schema.creditCard)
      .values({
        closingDay: 1,
        dueDay: 10,
        holderId: strangerHolder.id,
        limitCents: 500_000,
        name: 'Deles',
        organizationId: stranger.organizationId,
      })
      .returning();

    const yearly = await gql(viewer, ADD, {
      input: {
        amountCents: 100,
        cycle: 'YEARLY',
        description: 'IPVA?',
        dueDay: 5,
        holderId: holder.id,
      },
    });
    expect(yearly.errors).toEqual(['BAD_USER_INPUT']);
    const card = await gql(viewer, ADD, {
      input: {
        amountCents: 100,
        creditCardId: theirCard!.id,
        description: 'Spotify',
        dueDay: 5,
        holderId: holder.id,
        paymentMethod: 'CARD',
      },
    });
    expect(card.errors).toEqual(['NOT_FOUND']);
  });

  it('is proposed in the chat and written on confirmation', async () => {
    const viewer = await createViewer();
    const [bot] = await ensureBots(viewer.organizationId);
    const [conversation] = await db
      .insert(schema.conversation)
      .values({ botId: bot!.id, organizationId: viewer.organizationId })
      .returning();
    const { handler } = completionHandler([
      {
        arguments: { amount: '458,00', description: 'Seguro automotivo', dueDay: 5 },
        tool: 'propose_recurring_expense',
      },
      { text: 'Pronto, confira abaixo e confirme.' },
    ]);
    mswServer.use(modelListHandler, handler);
    await replyInConversation({
      content: 'Adicione um gasto recorrente de 458, o seguro automotivo, todo dia 5',
      conversationId: conversation!.id,
      send: () => {},
      viewer,
    });

    const [proposal] = await db
      .select()
      .from(schema.proposal)
      .where(eq(schema.proposal.conversationId, conversation!.id));
    expect(proposal).toMatchObject({ kind: 'RECURRING_EXPENSE', status: 'PENDING' });
    const confirmed = await gql(
      viewer,
      /* GraphQL */ `
        mutation ($id: ID!) {
          confirmProposal(id: $id) {
            status
          }
        }
      `,
      { id: proposal!.id }
    );
    expect(confirmed.errors).toEqual([]);

    const holder = await viewerHolder(viewer);
    const rows = await db
      .select()
      .from(schema.recurringExpense)
      .where(eq(schema.recurringExpense.holderId, holder.id));
    expect(rows).toMatchObject([
      { amountCents: 45_800, cycle: 'MONTHLY', description: 'Seguro automotivo', dueDay: 5 },
    ]);
  });
});
