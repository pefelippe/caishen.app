import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { prepaymentEffect, today } from '@zapbots/finance';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer } from '../../test/helpers';
import {
  completionHandler,
  modelListHandler,
  mswServer,
  textOf,
  type Completion,
} from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';
import { runJob } from '../services/bots/jobs';
import { scheduleInputFor } from '../services/obligations';
import { addExpense, createCreditOperation } from '../services/records';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(cents / 100);

async function startConversation(viewer: Viewer) {
  const [bot] = await ensureBots(viewer.organizationId);
  const [conversation] = await db
    .insert(schema.conversation)
    .values({ botId: bot!.id, organizationId: viewer.organizationId })
    .returning();
  return { bot: bot!, conversationId: conversation!.id };
}

/** Sends `content` with the Model answering `completions`; returns what was asked of the Model. */
async function say(viewer: Viewer, content: string, completions: Completion[]) {
  const { conversationId } = await startConversation(viewer);
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

/** What the Model read back from the tool it called in its first round. */
const toolAnswer = (log: Awaited<ReturnType<typeof say>>) => {
  const last = log[1]!.messages.at(-1)!;
  expect(last.role).toBe('tool');
  return textOf(last);
};

async function spend(viewer: Viewer, expenses: [string, string, number, string][]) {
  const holder = await viewerHolder(viewer);
  for (const [date, description, amountCents, category] of expenses) {
    await addExpense(viewer, { amountCents, category, date, description, holderId: holder.id });
  }
}

describe('ferramentas de leitura', () => {
  it('sums a period by category from the Viewer’s own Gastos only', async () => {
    const viewer = await createViewer();
    await spend(viewer, [
      ['2026-09-03', 'Supermercado', 25_000, 'Mercado'],
      ['2026-09-20', 'Feira', 5_050, 'Mercado'],
      ['2026-09-10', 'iFood', 8_990, 'Restaurante'],
      ['2026-10-01', 'Fora do período', 99_900, 'Mercado'],
    ]);
    const stranger = await createViewer('Bia');
    await spend(stranger, [['2026-09-05', 'Deles', 77_700, 'Mercado']]);

    const log = await say(viewer, 'Quanto gastei em setembro?', [
      { arguments: { from: '2026-09-01', to: '2026-09-30' }, tool: 'period_summary' },
      { text: 'Você gastou R$ 390,40.' },
    ]);

    expect(log[0]!.tools?.map(tool => tool.function.name)).toEqual(
      expect.arrayContaining(['period_summary', 'list_expenses', 'propose_expense'])
    );
    const answer = toolAnswer(log);
    expect(answer).toContain(`Gastos: ${brl(39_040)} em 3 lançamento(s)`);
    expect(answer).toContain(`Mercado: ${brl(30_050)} (2 lançamento(s))`);
    expect(answer).toContain(`Restaurante: ${brl(8_990)}`);
    expect(answer).not.toContain('Deles');
    expect(answer).not.toContain('Fora do período');
  });

  it('lists Gastos filtered by a text of the description, with their total', async () => {
    const viewer = await createViewer();
    await spend(viewer, [
      ['2026-09-10', 'iFood Pizzaria', 8_990, 'Restaurante'],
      ['2026-09-12', 'IFOOD Japonês', 12_000, 'Restaurante'],
      ['2026-09-15', 'Padaria', 1_500, 'Restaurante'],
    ]);

    const log = await say(viewer, 'Quanto foi de iFood?', [
      {
        arguments: { from: '2026-09-01', search: 'ifood', to: '2026-09-30' },
        tool: 'list_expenses',
      },
      { text: 'Foram R$ 209,90.' },
    ]);

    const answer = toolAnswer(log);
    expect(answer).toContain(`2 Gasto(s) de 01/09/2026 a 30/09/2026, total ${brl(20_990)}`);
    expect(answer.indexOf('IFOOD Japonês')).toBeLessThan(answer.indexOf('iFood Pizzaria'));
    expect(answer).not.toContain('Padaria');
  });

  it('simulates an Extra Amortization with the finance math, by the Operation’s name', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const operation = await createCreditOperation(viewer, {
      firstDueDate: '2026-11-10',
      holderId: holder.id,
      modality: 'PERSONAL_LOAN',
      monthlyRate: 0.025,
      name: 'Empréstimo Itaú',
      principalCents: 2_000_000,
      system: 'PRICE',
      termMonths: 24,
    });

    const log = await say(viewer, 'E se eu amortizar 5 mil no Itaú?', [
      {
        arguments: { amount: '5000,00', operation: 'empréstimo itaú' },
        tool: 'simulate_prepayment',
      },
      { text: 'Economiza bastante.' },
    ]);

    const input = await scheduleInputFor(operation);
    const effect = prepaymentEffect(input, today(), 500_000);
    const answer = toolAnswer(log);
    expect(answer).toContain(`economiza ${brl(effect.interestSavedCents)} de juros`);
    expect(answer).toContain(`e ${effect.installmentsSaved} Parcela(s)`);
  });

  it('answers the Model how to fix bad arguments instead of failing', async () => {
    const viewer = await createViewer();

    const log = await say(viewer, 'Quanto gastei?', [
      { arguments: { from: 'setembro', to: '2026-09-30' }, tool: 'period_summary' },
      { text: 'Qual período?' },
    ]);

    expect(toolAnswer(log)).toContain('Datas inválidas');
  });

  it('lets a Job read with tools, and never propose', async () => {
    const viewer = await createViewer();
    await spend(viewer, [['2026-09-03', 'Supermercado', 25_000, 'Mercado']]);
    const [bot] = await ensureBots(viewer.organizationId);
    const [job] = await db
      .insert(schema.job)
      .values({
        botId: bot!.id,
        createdById: viewer.userId,
        instructions: 'Resuma meus gastos de setembro',
        organizationId: viewer.organizationId,
      })
      .returning();
    const { handler, log } = completionHandler([
      { arguments: { from: '2026-09-01', to: '2026-09-30' }, tool: 'period_summary' },
      { text: 'Setembro: R$ 250,00 em Mercado.' },
    ]);
    mswServer.use(modelListHandler, handler);

    await runJob(viewer, job!.id);

    const names = log[0]!.tools?.map(tool => tool.function.name) ?? [];
    expect(names).toContain('period_summary');
    expect(names.some(name => name.startsWith('propose_'))).toBe(false);
    expect(textOf(log[0]!.messages[0])).toContain('Ferramentas de leitura');
    expect(toolAnswer(log)).toContain(`Gastos: ${brl(25_000)}`);
    const [done] = await db.select().from(schema.job).where(eq(schema.job.id, job!.id));
    expect(done).toMatchObject({ deliverable: 'Setembro: R$ 250,00 em Mercado.', status: 'DONE' });
  });
});
