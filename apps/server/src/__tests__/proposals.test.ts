import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { priceInstallment } from '@zapbots/finance';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  completionHandler,
  modelListHandler,
  MODEL_WITHOUT_TOOLS,
  mswServer,
  textOf,
  type Completion,
} from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const CONVERSATION = /* GraphQL */ `
  query ($id: ID!) {
    conversation(id: $id) {
      messages {
        role
        proposals {
          id
          action
          kind
          status
          title
          lines {
            label
            value
          }
          recordId
        }
      }
    }
  }
`;
const CONFIRM = /* GraphQL */ `
  mutation ($id: ID!) {
    confirmProposal(id: $id) {
      status
      recordId
    }
  }
`;
const CANCEL = /* GraphQL */ `
  mutation ($id: ID!) {
    cancelProposal(id: $id) {
      status
    }
  }
`;

const LOAN = {
  firstDueDate: '2026-11-10',
  modality: 'PERSONAL_LOAN',
  monthlyRatePercent: '2,5',
  name: 'Empréstimo Itaú',
  principal: '20000,00',
  termMonths: 24,
};

async function startConversation(viewer: Viewer) {
  const [bot] = await ensureBots(viewer.organizationId);
  const [conversation] = await db
    .insert(schema.conversation)
    .values({ botId: bot!.id, organizationId: viewer.organizationId })
    .returning();
  return { bot: bot!, conversationId: conversation!.id };
}

/** Sends `content` with the Model answering `completions`; returns what was asked of the Model. */
async function say(
  viewer: Viewer,
  conversationId: string,
  content: string,
  completions: Completion[]
) {
  const { handler, log } = completionHandler(completions);
  mswServer.use(modelListHandler, handler);
  const errors: string[] = [];
  await replyInConversation({
    content,
    conversationId,
    send: event => {
      if (event.type === 'error') errors.push(event.message);
    },
    viewer,
  });
  expect(errors).toEqual([]);
  return log;
}

async function proposalsOf(viewer: Viewer, conversationId: string) {
  const { data } = await gql(viewer, CONVERSATION, { id: conversationId });
  return data.conversation.messages.flatMap(
    (message: { proposals: unknown[] }) => message.proposals
  ) as {
    id: string;
    kind: string;
    lines: { label: string; value: string }[];
    recordId: string | null;
    status: string;
    title: string;
  }[];
}

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(cents / 100);

describe('records proposed in the chat', () => {
  it('writes a loan only when the User confirms, and only once', async () => {
    const viewer = await createViewer();
    const { conversationId } = await startConversation(viewer);

    const log = await say(viewer, conversationId, 'Adicione um empréstimo de 20 mil no Itaú', [
      { arguments: LOAN, tool: 'propose_credit_operation' },
      { text: 'Confira abaixo e confirme.' },
    ]);

    expect(log[0]!.tools?.map(tool => tool.function.name)).toContain('propose_credit_operation');
    expect(log[1]!.messages.at(-1)).toMatchObject({ role: 'tool' });
    expect(log[1]!.messages.at(-1)!.content).toContain('Proposta criada, ainda não gravada');

    const operations = () =>
      db
        .select()
        .from(schema.creditOperation)
        .where(eq(schema.creditOperation.organizationId, viewer.organizationId));
    expect(await operations()).toHaveLength(0);

    const [proposal] = await proposalsOf(viewer, conversationId);
    expect(proposal).toMatchObject({ kind: 'CREDIT_OPERATION', status: 'PENDING' });
    expect(proposal!.lines).toContainEqual({ label: 'Valor', value: brl(2_000_000) });
    expect(proposal!.lines).toContainEqual({
      label: 'Parcela (Price)',
      value: brl(priceInstallment(2_000_000, '0.025', 24)),
    });

    const first = await gql(viewer, CONFIRM, { id: proposal!.id });
    expect(first.errors).toEqual([]);
    expect(first.data.confirmProposal.status).toBe('CONFIRMED');
    const again = await gql(viewer, CONFIRM, { id: proposal!.id });
    expect(again.errors).toEqual(['BAD_USER_INPUT']);

    const written = await operations();
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      id: first.data.confirmProposal.recordId,
      monthlyRate: '0.025000000000',
      principalCents: 2_000_000,
      rateSource: 'INFORMED',
      termMonths: 24,
    });
  });

  it('keeps another Organization from confirming or cancelling it', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const { conversationId } = await startConversation(viewer);
    await say(viewer, conversationId, 'Adicione o empréstimo', [
      { arguments: LOAN, tool: 'propose_credit_operation' },
      { text: 'Confira.' },
    ]);
    const [proposal] = await proposalsOf(viewer, conversationId);

    expect((await gql(stranger, CONFIRM, { id: proposal!.id })).errors).toEqual(['NOT_FOUND']);
    expect((await gql(stranger, CANCEL, { id: proposal!.id })).errors).toEqual(['NOT_FOUND']);
    expect((await proposalsOf(viewer, conversationId))[0]!.status).toBe('PENDING');
  });

  it('writes nothing when the User cancels a monthly revenue', async () => {
    const viewer = await createViewer();
    const { conversationId } = await startConversation(viewer);
    await say(viewer, conversationId, 'Meu faturamento é 15 mil todo mês desde janeiro', [
      {
        arguments: { description: 'Faturamento', monthlyAmount: '15.000', startsOn: '2026-01-01' },
        tool: 'propose_income_source',
      },
      { text: 'Confira.' },
    ]);
    const [proposal] = await proposalsOf(viewer, conversationId);
    expect(proposal).toMatchObject({ kind: 'INCOME_SOURCE', title: 'Fonte de Renda' });
    expect(proposal!.lines).toContainEqual({ label: 'Por mês', value: brl(1_500_000) });

    expect((await gql(viewer, CANCEL, { id: proposal!.id })).data.cancelProposal.status).toBe(
      'CANCELLED'
    );
    expect((await gql(viewer, CONFIRM, { id: proposal!.id })).errors).toEqual(['BAD_USER_INPUT']);
    const holder = await viewerHolder(viewer);
    const sources = await db
      .select()
      .from(schema.incomeSource)
      .where(eq(schema.incomeSource.holderId, holder.id));
    expect(sources).toHaveLength(0);
  });

  it('asks back for a missing rate instead of proposing', async () => {
    const viewer = await createViewer();
    const { conversationId } = await startConversation(viewer);
    const { monthlyRatePercent: _, ...withoutRate } = LOAN;
    const log = await say(viewer, conversationId, 'Adicione o empréstimo', [
      { arguments: withoutRate, tool: 'propose_credit_operation' },
      { text: 'Qual é a taxa ou a parcela?' },
    ]);

    expect(log[1]!.messages.at(-1)!.content).toContain(
      'Informe a taxa mensal ou o valor da parcela'
    );
    expect(await proposalsOf(viewer, conversationId)).toEqual([]);
  });

  it('lets the User correct a pending Proposal before confirming it', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const { conversationId } = await startConversation(viewer);
    await say(viewer, conversationId, 'Gastei 50 no açaí hoje', [
      {
        arguments: { amount: '50,00', date: '2026-10-22', description: 'Açaí' },
        tool: 'propose_expense',
      },
      { text: 'Pronto, confira abaixo.' },
    ]);
    const [proposal] = await proposalsOf(viewer, conversationId);
    const EDIT = /* GraphQL */ `
      mutation ($id: ID!, $values: [RecordValueInput!]!) {
        editProposal(id: $id, values: $values) {
          lines {
            label
            value
          }
          fields {
            key
            value
          }
        }
      }
    `;
    const values = [
      { key: 'description', value: 'Açaí' },
      { key: 'category', value: 'Alimentação' },
      { key: 'amount', value: '45,90' },
      { key: 'date', value: '2026-10-21' },
    ];

    expect((await gql(stranger, EDIT, { id: proposal!.id, values })).errors).toEqual(['NOT_FOUND']);
    const bad = await gql(viewer, EDIT, {
      id: proposal!.id,
      values: values.map(entry => (entry.key === 'amount' ? { ...entry, value: 'abc' } : entry)),
    });
    expect(bad.errors).toEqual(['BAD_USER_INPUT']);

    const edited = await gql(viewer, EDIT, { id: proposal!.id, values });
    expect(edited.errors).toEqual([]);
    expect(edited.data.editProposal.lines).toContainEqual({ label: 'Valor', value: brl(4590) });
    expect(edited.data.editProposal.fields).toContainEqual({ key: 'amount', value: '45,90' });

    await gql(viewer, CONFIRM, { id: proposal!.id });
    const [expense] = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.organizationId, viewer.organizationId));
    expect(expense).toMatchObject({
      amountCents: 4590,
      category: 'Alimentação',
      date: '2026-10-21',
    });
    expect((await gql(viewer, EDIT, { id: proposal!.id, values })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
  });

  it('replaces a pending Proposal with the newer one', async () => {
    const viewer = await createViewer();
    const { conversationId } = await startConversation(viewer);
    await say(viewer, conversationId, 'Adicione o empréstimo', [
      { arguments: LOAN, tool: 'propose_credit_operation' },
      { text: 'Confira.' },
    ]);
    await say(viewer, conversationId, 'Muda pra 36 meses', [
      { arguments: { ...LOAN, termMonths: 36 }, tool: 'propose_credit_operation' },
      { text: 'Confira.' },
    ]);

    const [older, newer] = await proposalsOf(viewer, conversationId);
    expect(older!.status).toBe('CANCELLED');
    expect(newer!.status).toBe('PENDING');
    expect(newer!.lines).toContainEqual({ label: 'Prazo', value: '36 meses' });
  });

  it('answers read-only when the routed Model refuses tools', async () => {
    const viewer = await createViewer();
    const { conversationId } = await startConversation(viewer);

    const log = await say(viewer, conversationId, 'oi', [{ status: 404 }, { text: 'Olá!' }]);

    expect(log[0]!.tools).toBeDefined();
    expect(log[1]!.tools).toBeUndefined();
    expect(textOf(log[1]!.messages[0])).toContain('Você só lê');
    const { data } = await gql(viewer, CONVERSATION, { id: conversationId });
    expect(data.conversation.messages.at(-1).role).toBe('BOT');
  });

  it('chats without tools on a Model that cannot call them', async () => {
    const viewer = await createViewer();
    const { bot, conversationId } = await startConversation(viewer);
    await db
      .update(schema.bot)
      .set({ model: MODEL_WITHOUT_TOOLS })
      .where(eq(schema.bot.id, bot.id));

    const log = await say(viewer, conversationId, 'Adicione o empréstimo', [
      { text: 'Cadastre no Financeiro.' },
    ]);

    expect(log[0]!.tools).toBeUndefined();
    expect(textOf(log[0]!.messages[0])).toContain('Você só lê');
  });

  it('proposes a correction to a saved Gasto and writes it only on confirmation', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [expense] = await db
      .insert(schema.expense)
      .values({
        amountCents: 5000,
        category: 'Alimentação',
        date: '2026-10-22',
        description: 'Açaí',
        holderId: holder.id,
        organizationId: viewer.organizationId,
      })
      .returning();
    const { conversationId } = await startConversation(viewer);

    const log = await say(viewer, conversationId, 'O açaí foi 45, não 50', [
      {
        arguments: { amount: '45,00', kind: 'EXPENSE', recordId: expense!.id },
        tool: 'propose_update',
      },
      { text: 'Pronto, confira abaixo.' },
    ]);
    expect(textOf(log[0]!.messages[0])).toContain(`EXPENSE ${expense!.id}`);

    const [proposal] = await proposalsOf(viewer, conversationId);
    expect(proposal).toMatchObject({ action: 'UPDATE', kind: 'EXPENSE', status: 'PENDING' });
    expect(proposal!.lines).toContainEqual({
      label: 'Valor',
      value: `${brl(5000)} → ${brl(4500)}`,
    });
    const row = async () =>
      (await db.select().from(schema.expense).where(eq(schema.expense.id, expense!.id)))[0];
    expect((await row())!.amountCents).toBe(5000);

    const confirmed = await gql(viewer, CONFIRM, { id: proposal!.id });
    expect(confirmed.data.confirmProposal.recordId).toBe(expense!.id);
    expect(await row()).toMatchObject({
      amountCents: 4500,
      category: 'Alimentação',
      date: '2026-10-22',
      description: 'Açaí',
    });
  });

  it("never proposes correcting another Organization's record", async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const strangerHolder = await viewerHolder(stranger);
    const [theirs] = await db
      .insert(schema.expense)
      .values({
        amountCents: 5000,
        date: '2026-10-22',
        description: 'Deles',
        holderId: strangerHolder.id,
        organizationId: stranger.organizationId,
      })
      .returning();
    const { conversationId } = await startConversation(viewer);

    const log = await say(viewer, conversationId, 'Muda pra 1 real', [
      {
        arguments: { amount: '1,00', kind: 'EXPENSE', recordId: theirs!.id },
        tool: 'propose_update',
      },
      { text: 'Não achei esse registro.' },
    ]);

    expect(log[1]!.messages.at(-1)!.content).toContain('Não deu para propor');
    expect(await proposalsOf(viewer, conversationId)).toEqual([]);
  });

  it('corrects only what the chat names on a financing', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [operation] = await db
      .insert(schema.creditOperation)
      .values({
        collateralDescription: 'Onix 2022',
        collateralValueCents: 8_500_000,
        firstDueDate: '2026-11-10',
        holderId: holder.id,
        modality: 'VEHICLE_FINANCING',
        monthlyRate: '0.019876543210',
        name: 'Financiamento do carro',
        organizationId: viewer.organizationId,
        principalCents: 6_000_000,
        rateSource: 'IMPLIED',
        system: 'PRICE',
        termMonths: 48,
      })
      .returning();
    const { conversationId } = await startConversation(viewer);
    await say(viewer, conversationId, 'O prazo do carro é 60 meses', [
      {
        arguments: { kind: 'CREDIT_OPERATION', recordId: operation!.id, termMonths: 60 },
        tool: 'propose_update',
      },
      { text: 'Pronto, confira abaixo.' },
    ]);
    const [proposal] = await proposalsOf(viewer, conversationId);
    await gql(viewer, CONFIRM, { id: proposal!.id });

    const [row] = await db
      .select()
      .from(schema.creditOperation)
      .where(eq(schema.creditOperation.id, operation!.id));
    expect(row).toMatchObject({
      collateralDescription: 'Onix 2022',
      collateralValueCents: 8_500_000,
      monthlyRate: '0.019876543210',
      rateSource: 'IMPLIED',
      termMonths: 60,
    });
  });

  it('deletes a saved record only when the User confirms', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const [expense] = await db
      .insert(schema.expense)
      .values({
        amountCents: 5000,
        date: '2026-10-22',
        description: 'Açaí',
        holderId: holder.id,
        organizationId: viewer.organizationId,
      })
      .returning();
    const { conversationId } = await startConversation(viewer);

    const log = await say(viewer, conversationId, 'Apaga o gasto do açaí', [
      { arguments: { kind: 'EXPENSE', recordId: expense!.id }, tool: 'propose_delete' },
      { text: 'Pronto, confira abaixo e confirme.' },
    ]);
    expect(log[0]!.tools?.map(tool => tool.function.name)).toContain('propose_delete');

    const [proposal] = await proposalsOf(viewer, conversationId);
    expect(proposal).toMatchObject({ action: 'DELETE', kind: 'EXPENSE', status: 'PENDING' });
    expect(proposal!.lines).toContainEqual({ label: 'Valor', value: brl(5000) });
    const rows = () => db.select().from(schema.expense).where(eq(schema.expense.id, expense!.id));
    expect(await rows()).toHaveLength(1);

    const EDIT = /* GraphQL */ `
      mutation ($id: ID!) {
        editProposal(id: $id, values: [{ key: "amount", value: "1,00" }]) {
          id
        }
      }
    `;
    expect((await gql(viewer, EDIT, { id: proposal!.id })).errors).toEqual(['BAD_USER_INPUT']);
    expect((await gql(stranger, CONFIRM, { id: proposal!.id })).errors).toEqual(['NOT_FOUND']);
    expect(await rows()).toHaveLength(1);

    expect((await gql(viewer, CONFIRM, { id: proposal!.id })).errors).toEqual([]);
    expect(await rows()).toHaveLength(0);
  });

  it("never proposes deleting another Organization's record", async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const strangerHolder = await viewerHolder(stranger);
    const [theirs] = await db
      .insert(schema.expense)
      .values({
        amountCents: 5000,
        date: '2026-10-22',
        description: 'Deles',
        holderId: strangerHolder.id,
        organizationId: stranger.organizationId,
      })
      .returning();
    const { conversationId } = await startConversation(viewer);

    await say(viewer, conversationId, 'Apaga esse', [
      { arguments: { kind: 'EXPENSE', recordId: theirs!.id }, tool: 'propose_delete' },
      { text: 'Não achei.' },
    ]);

    expect(await proposalsOf(viewer, conversationId)).toEqual([]);
    expect(
      await db.select().from(schema.expense).where(eq(schema.expense.id, theirs!.id))
    ).toHaveLength(1);
  });

  it('finds the record by its name when the Model has no id', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [source] = await db
      .insert(schema.incomeSource)
      .values({
        description: 'SALARIO',
        holderId: holder.id,
        monthlyNetCents: 2_200_000,
        startsOn: '2026-01-01',
      })
      .returning();
    const { conversationId } = await startConversation(viewer);

    await say(viewer, conversationId, 'Pode excluir meu salário', [
      { arguments: { kind: 'INCOME_SOURCE', recordName: 'salario' }, tool: 'propose_delete' },
      { text: 'Pronto, confira abaixo e confirme.' },
    ]);
    const [proposal] = await proposalsOf(viewer, conversationId);
    expect(proposal).toMatchObject({ action: 'DELETE', kind: 'INCOME_SOURCE' });

    await gql(viewer, CONFIRM, { id: proposal!.id });
    expect(
      await db.select().from(schema.incomeSource).where(eq(schema.incomeSource.id, source!.id))
    ).toHaveLength(0);
  });
});
