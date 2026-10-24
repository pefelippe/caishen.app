import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { addDays, today } from '@zapbots/finance';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { mswServer } from '../../test/msw/openrouter';
import { pluggyHandlers, type FakeItem } from '../../test/msw/pluggy';
import { resetPluggyKey } from '../services/openFinance/pluggy';
import { handlePluggyEvent, pluggyWebhookAuthorized } from '../services/openFinance/webhook';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
beforeEach(() => resetPluggyKey());
afterEach(() => {
  mswServer.resetHandlers();
  delete process.env.OPEN_FINANCE_EMAILS;
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const LINK = /* GraphQL */ `
  mutation ($itemId: String!) {
    linkBank(itemId: $itemId) {
      added
      link {
        id
        institution
        status
        accounts {
          kind
          name
          balanceCents
        }
      }
    }
  }
`;
const SYNC = /* GraphQL */ `
  mutation ($id: ID!) {
    syncBankLink(id: $id) {
      added
    }
  }
`;
const UNLINK = /* GraphQL */ `
  mutation ($id: ID!) {
    unlinkBank(id: $id)
  }
`;
const CONNECTIONS = /* GraphQL */ `
  query {
    connections {
      kind
      available
      connected
      unavailableReason
    }
  }
`;

/** Only this Viewer may use Open Finance, as `OPEN_FINANCE_EMAILS` says on the owner's server. */
async function allow(viewer: Viewer) {
  const [user] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  process.env.OPEN_FINANCE_EMAILS = `outra@pessoa.com, ${user!.email.toUpperCase()}`;
}

const daysAgo = (days: number) => `${addDays(today(), -days)}T03:00:00.000Z`;

/** A bank with a checking account read over two pages, and a card. Ids are new for each test. */
function bank(): { itemId: string; item: FakeItem } {
  const id = crypto.randomUUID();
  return {
    item: {
      accounts: [
        {
          balance: 1520.35,
          id: `${id}-acc`,
          name: 'Conta corrente',
          number: '1234-5',
          type: 'BANK',
        },
        {
          balance: 800,
          id: `${id}-card`,
          name: 'Nubank Ultravioleta',
          number: '9876',
          type: 'CREDIT',
        },
      ],
      transactions: {
        [`${id}-acc`]: [
          [
            {
              amount: -45.9,
              date: daysAgo(3),
              description: 'Padaria',
              id: `${id}-t1`,
              type: 'DEBIT',
            },
            {
              amount: 5000,
              date: daysAgo(5),
              description: 'Salário',
              id: `${id}-t2`,
              type: 'CREDIT',
            },
          ],
          [
            {
              amount: -1250,
              date: daysAgo(6),
              description: 'Pagamento de fatura',
              id: `${id}-t3`,
              type: 'DEBIT',
            },
            {
              amount: -0.1,
              date: daysAgo(7),
              description: 'Tarifa',
              id: `${id}-t4`,
              type: 'DEBIT',
            },
            {
              amount: -30,
              date: daysAgo(1),
              description: 'Uber',
              id: `${id}-t5`,
              status: 'PENDING',
              type: 'DEBIT',
            },
          ],
        ],
        [`${id}-card`]: [
          [{ amount: 99, date: daysAgo(2), description: 'Loja', id: `${id}-c1`, type: 'DEBIT' }],
        ],
      },
    },
    itemId: id,
  };
}

const expensesOf = async (viewer: Viewer) =>
  db
    .select()
    .from(schema.expense)
    .where(eq(schema.expense.holderId, (await viewerHolder(viewer)).id));

describe('Open Finance through Meu Pluggy', () => {
  it('is closed to anyone not in OPEN_FINANCE_EMAILS, whatever item they paste', async () => {
    const owner = await createViewer();
    const stranger = await createViewer('Bruno');
    await allow(owner);
    const { item, itemId } = bank();
    const fake = pluggyHandlers({ [itemId]: item });
    mswServer.use(...fake.handlers);

    const { data, errors } = await gql(stranger, LINK, { itemId });
    expect(data).toBeNull();
    expect(errors).toEqual(['BAD_USER_INPUT']);
    // Pluggy was never asked: the key reads every item, so nothing goes out for them.
    expect(fake.requests).toEqual([]);

    const { data: listed } = await gql(stranger, CONNECTIONS);
    expect(listed.connections).toContainEqual({
      available: false,
      connected: false,
      kind: 'OPEN_FINANCE',
      unavailableReason: 'O Open Finance ainda não está aberto para sua conta.',
    });
  });

  it('brings in the debits of the accounts as Gastos, once, following the cursor', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    const { item, itemId } = bank();
    const fake = pluggyHandlers({ [itemId]: item });
    mswServer.use(...fake.handlers);

    const { data, errors } = await gql(viewer, LINK, { itemId });
    expect(errors).toEqual([]);
    // Padaria and Tarifa: not the salary, the Fatura paid, the line still pending or the card's.
    expect(data.linkBank.added).toBe(2);
    expect(data.linkBank.link).toMatchObject({ institution: 'MeuPluggy', status: 'ACTIVE' });
    expect(data.linkBank.link.accounts).toEqual([
      { balanceCents: 152035, kind: 'BANK', name: 'Conta corrente' },
      { balanceCents: 80000, kind: 'CREDIT', name: 'Nubank Ultravioleta' },
    ]);
    const second = fake.requests.find(url => url.searchParams.get('after') === '1');
    expect(second?.searchParams.get('accountId')).toBe(`${itemId}-acc`);
    expect(fake.requests.some(url => url.searchParams.get('accountId') === `${itemId}-card`)).toBe(
      false
    );

    const expenses = await expensesOf(viewer);
    expect(expenses.map(row => [row.description, row.amountCents, row.imported]).sort()).toEqual([
      ['Padaria', 4590, true],
      ['Tarifa', 10, true],
    ]);
    expect(expenses.every(row => row.externalId?.startsWith('pluggy:'))).toBe(true);

    // Read again, the same lines add nothing; a new one comes in.
    const link = data.linkBank.link.id;
    expect((await gql(viewer, SYNC, { id: link })).data.syncBankLink.added).toBe(0);
    item.transactions[`${itemId}-acc`]![0]!.push({
      amount: -12,
      date: daysAgo(0),
      description: 'Café',
      id: `${itemId}-t6`,
      type: 'DEBIT',
    });
    expect((await gql(viewer, SYNC, { id: link })).data.syncBankLink.added).toBe(1);
    // Pasting the same item again reads it, without a second link.
    expect((await gql(viewer, LINK, { itemId })).data.linkBank.link.id).toBe(link);
  });

  it('keeps one bank to one Organization, and its link to itself', async () => {
    const owner = await createViewer();
    const other = await createViewer('Bruno');
    await allow(owner);
    const { item, itemId } = bank();
    mswServer.use(...pluggyHandlers({ [itemId]: item }).handlers);
    const { data } = await gql(owner, LINK, { itemId });
    const link = data.linkBank.link.id;

    process.env.OPEN_FINANCE_EMAILS = `${process.env.OPEN_FINANCE_EMAILS},${other.userId}@test.local`;
    expect((await gql(other, LINK, { itemId })).errors).toEqual(['BAD_USER_INPUT']);
    expect((await gql(other, SYNC, { id: link })).errors).toEqual(['NOT_FOUND']);
    expect((await gql(other, UNLINK, { id: link })).data.unlinkBank).toBe(false);
    expect(await expensesOf(other)).toEqual([]);
  });

  it('refuses an item Pluggy does not know', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    mswServer.use(...pluggyHandlers({}).handlers);
    const { errors } = await gql(viewer, LINK, { itemId: 'nao-existe' });
    expect(errors).toEqual(['BAD_USER_INPUT']);
  });

  it('marks a link whose consent ran out, and reads nothing from it', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    const { item, itemId } = bank();
    item.status = 'LOGIN_ERROR';
    item.error = { code: 'USER_AUTHORIZATION_EXPIRED', message: 'Autorização expirada' };
    mswServer.use(...pluggyHandlers({ [itemId]: item }).handlers);

    const { data } = await gql(viewer, LINK, { itemId });
    expect(data.linkBank).toMatchObject({ added: 0, link: { accounts: [], status: 'EXPIRED' } });
    expect(await expensesOf(viewer)).toEqual([]);
  });

  it('unlinking takes the accounts and the Gastos along, and revokes the consent', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    const { item, itemId } = bank();
    mswServer.use(...pluggyHandlers({ [itemId]: item }).handlers);
    const { data } = await gql(viewer, LINK, { itemId });
    const link = data.linkBank.link.id;
    const holder = await viewerHolder(viewer);
    // A Gasto typed in stays.
    await db.insert(schema.expense).values({
      amountCents: 1000,
      date: today(),
      description: 'Digitado',
      holderId: holder.id,
      organizationId: viewer.organizationId,
    });

    expect((await gql(viewer, UNLINK, { id: link })).data.unlinkBank).toBe(true);
    expect((await expensesOf(viewer)).map(row => row.description)).toEqual(['Digitado']);
    const accounts = await db
      .select()
      .from(schema.bankAccount)
      .where(eq(schema.bankAccount.bankLinkId, link));
    expect(accounts).toEqual([]);
    const [consent] = await db
      .select()
      .from(schema.consent)
      .where(eq(schema.consent.holderId, holder.id));
    expect(consent).toMatchObject({ source: 'OPEN_FINANCE' });
    expect(consent!.revokedAt).not.toBeNull();
  });

  it('reads a linked item again when the Pluggy webhook says it changed', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    const { item, itemId } = bank();
    const fake = pluggyHandlers({ [itemId]: item });
    mswServer.use(...fake.handlers);
    await gql(viewer, LINK, { itemId });
    item.transactions[`${itemId}-acc`]![0]!.push({
      amount: -12,
      date: daysAgo(0),
      description: 'Café',
      id: `${itemId}-t6`,
      type: 'DEBIT',
    });

    expect(await handlePluggyEvent({ event: 'item/updated', itemId })).toBe(1);
    expect((await expensesOf(viewer)).map(row => row.description)).toContain('Café');
    // Lines reported right after the read that brought them are not read twice.
    expect(await handlePluggyEvent({ event: 'transactions/created', itemId })).toBeNull();
    // An item no link has, or an event without one, reads nothing.
    expect(await handlePluggyEvent({ event: 'item/updated', itemId: 'outro' })).toBeNull();
    expect(await handlePluggyEvent({ event: 'connector/status_updated' })).toBeNull();
  });

  it('stops reading from the webhook once the User may no longer use Open Finance', async () => {
    const viewer = await createViewer();
    await allow(viewer);
    const { item, itemId } = bank();
    const fake = pluggyHandlers({ [itemId]: item });
    mswServer.use(...fake.handlers);
    await gql(viewer, LINK, { itemId });
    const asked = fake.requests.length;

    process.env.OPEN_FINANCE_EMAILS = 'outra@pessoa.com';
    expect(await handlePluggyEvent({ event: 'item/updated', itemId })).toBeNull();
    expect(fake.requests.length).toBe(asked);
  });

  it('takes the webhook only with the secret', () => {
    expect(pluggyWebhookAuthorized('test-webhook-secret')).toBe(true);
    expect(pluggyWebhookAuthorized('test-webhook-secreT')).toBe(false);
    expect(pluggyWebhookAuthorized('curto')).toBe(false);
    expect(pluggyWebhookAuthorized(undefined)).toBe(false);
  });
});
