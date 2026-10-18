import { addDays, addMonths, today } from '@zapbots/finance';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { failingMarketRatesHandler, marketRatesHandler } from '../../test/msw/bacen';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import { replyInConversation } from '../services/bots/chat';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

type Viewer = Awaited<ReturnType<typeof createViewer>>;

const ALERTS = `{ bots { alerts { kind message href } } }`;

async function operation(viewer: Viewer, name: string, monthlyRate: number, firstDueDate: string) {
  const holder = await gql(viewer, `{ viewerHolder { id } }`);
  const { data } = await gql(
    viewer,
    `mutation ($holderId: ID!, $name: String!, $monthlyRate: Float!, $firstDueDate: Date!) {
      createCreditOperation(input: {
        holderId: $holderId, name: $name, modality: PERSONAL_LOAN, system: PRICE,
        principalCents: 1200000, termMonths: 12, firstDueDate: $firstDueDate, monthlyRate: $monthlyRate
      }) { id }
    }`,
    { firstDueDate, holderId: holder.data.viewerHolder.id, monthlyRate, name }
  );
  return data.createCreditOperation.id as string;
}

describe('alerts', () => {
  it('points out what is overdue, what is due within a week and rates well above the market', async () => {
    mswServer.use(
      marketRatesHandler({ 'Crédito pessoal não consignado - Prefixado': [2, 2.5, 3] })
    );
    const viewer = await createViewer();
    const asOf = today();
    // Started over two months ago, its 2nd installment is late and the next one is weeks away.
    const late = await operation(viewer, 'Atrasado', 0.03, addDays(addMonths(asOf, -2), -10));
    await gql(
      viewer,
      `mutation ($id: ID!) { recordLatePayment(creditOperationId: $id, installmentNumber: 2) { id } }`,
      { id: late }
    );
    // First installment in three days, at a rate 1,5 point above the market's.
    const expensive = await operation(viewer, 'Caro', 0.04, addDays(asOf, 3));
    // First installment in twenty days: no Alert.
    await operation(viewer, 'Tranquilo', 0.025, addDays(asOf, 20));

    const { data, errors } = await gql(viewer, ALERTS);
    expect(errors).toEqual([]);
    const alerts = data.bots[0].alerts;
    expect(alerts.map((alert: { kind: string }) => alert.kind)).toEqual([
      'OVERDUE',
      'DUE_SOON',
      'ABOVE_MARKET',
      'STALE_ASSESSMENT',
    ]);
    expect(alerts[3].message).toBe(
      'Você ainda não gerou uma Avaliação. Gere uma para ver seu Score.'
    );
    expect(alerts[0]).toEqual({
      href: `/caishen/operacoes/${late}`,
      kind: 'OVERDUE',
      message: expect.stringMatching(/^Atrasado tem R\$ [\d.,]+ em atraso\.$/),
    });
    expect(alerts[1].message).toMatch(/^Caro · Parcela 1\/12 vence em \d{2}\/\d{2}\/\d{4}: R\$/);
    expect(alerts[2]).toEqual({
      href: `/caishen/operacoes/${expensive}`,
      kind: 'ABOVE_MARKET',
      message: expect.stringContaining('está 1,50 ponto(s) percentual(is) ao mês acima'),
    });
    expect(JSON.stringify(alerts)).not.toContain('Tranquilo');

    // Caishen is told the same Alerts, most urgent first, before answering.
    const bot = await gql(viewer, `{ bot(key: FINANCE) { id } }`);
    const started = await gql(
      viewer,
      `mutation ($id: ID!) { startConversation(botId: $id) { id } }`,
      { id: bot.data.bot.id }
    );
    const { handler, log } = completionHandler([{ text: 'O atraso primeiro.' }]);
    mswServer.use(handler);
    await replyInConversation({
      content: 'O que merece minha atenção agora?',
      conversationId: started.data.startConversation.id,
      send: () => undefined,
      viewer,
    });
    const system = log[0]!.messages[0]!.content!;
    const section = system.slice(system.indexOf('## Avisos'));
    expect(section.split('\n').slice(2, 2 + alerts.length)).toEqual(
      alerts.map((alert: { message: string }) => `- ${alert.message}`)
    );
  });

  it('points out a Card near its limit, and stops asking for an Assessment once a fresh one exists', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const holderId: string = holder.data.viewerHolder.id;
    const setup = await gql(
      viewer,
      `mutation ($holderId: ID!) {
        addIncomeSource(input: {
          holderId: $holderId, description: "Salário", monthlyNetCents: 500000, startsOn: "2020-01-01"
        }) { id }
        full: createCreditCard(input: {
          holderId: $holderId, name: "Cheio", limitCents: 100000, closingDay: 3, dueDay: 10
        }) { id }
        calm: createCreditCard(input: {
          holderId: $holderId, name: "Folgado", limitCents: 100000, closingDay: 3, dueDay: 10
        }) { id }
        paid: createCreditCard(input: {
          holderId: $holderId, name: "Quitado", limitCents: 100000, closingDay: 3, dueDay: 10
        }) { id }
      }`,
      { holderId }
    );
    const statement = (creditCardId: string, referenceMonth: string, amountCents: number) =>
      gql(
        viewer,
        `mutation ($input: UpsertStatementInput!) { upsertStatement(input: $input) { id } }`,
        { input: { amountCents, creditCardId, referenceMonth } }
      );
    // Only the latest Statement counts: the older, fuller one of "Folgado" does not.
    await statement(setup.data.full.id, '2030-01', 85_000);
    await statement(setup.data.calm.id, '2029-12', 95_000);
    await statement(setup.data.calm.id, '2030-01', 20_000);
    // A full Statement that came due long ago is no longer open: no Alert.
    await statement(setup.data.paid.id, '2020-01', 99_000);

    const before = (await gql(viewer, ALERTS)).data.bots[0].alerts;
    expect(before).toEqual([
      {
        href: '/caishen/financas',
        kind: 'HIGH_UTILIZATION',
        message:
          'A última Fatura do Cheio usa 85% do limite: uma Utilização de Limite alta pesa no Score.',
      },
      expect.objectContaining({ kind: 'STALE_ASSESSMENT' }),
    ]);

    await gql(
      viewer,
      `mutation ($holderId: ID!) { generateAssessment(holderId: $holderId) { id } }`,
      {
        holderId,
      }
    );
    const after = (await gql(viewer, ALERTS)).data.bots[0].alerts;
    expect(after.map((alert: { kind: string }) => alert.kind)).toEqual(['HIGH_UTILIZATION']);
  });

  it('points out a Routine that failed, but not a Job the User saw fail', async () => {
    const viewer = await createViewer();
    const botId = (await gql(viewer, `{ bot(key: FINANCE) { id } }`)).data.bot.id;
    mswServer.use(completionHandler([{ status: 500 }, { status: 500 }]).handler);
    const routine = await gql(
      viewer,
      `mutation ($botId: ID!) {
        createRoutine(input: { botId: $botId, cadence: WEEKLY, instructions: "Resumo da semana" }) { id }
      }`,
      { botId }
    );
    expect(routine.errors).toEqual([]);
    await gql(
      viewer,
      `mutation ($botId: ID!) { createJob(input: { botId: $botId, instructions: "Pedido avulso" }) { id } }`,
      { botId }
    );
    const alerts = await vi.waitFor(
      async () => {
        const jobs = await gql(viewer, `query ($botId: ID!) { jobs(botId: $botId) { status } }`, {
          botId,
        });
        // Both Jobs must have failed, so the absence of the second Alert means something.
        if (jobs.data.jobs.some((job: { status: string }) => job.status !== 'FAILED')) {
          throw new Error('still running');
        }
        const { data } = await gql(viewer, ALERTS);
        const found = data.bots[0].alerts.filter(
          (alert: { kind: string }) => alert.kind === 'ROUTINE_FAILED'
        );
        if (!found.length) throw new Error('not failed yet');
        return found;
      },
      { interval: 20, timeout: 3000 }
    );
    expect(alerts).toEqual([
      {
        href: expect.stringMatching(/^\/caishen\/trabalhos\//),
        kind: 'ROUTINE_FAILED',
        message: expect.stringMatching(
          /^A Rotina "Resumo da semana" falhou em \d{2}\/\d{2}\/\d{4}\. Abra o Trabalho para pedir de novo\.$/
        ),
      },
    ]);
  });

  it('has nothing to say about an empty Organization', async () => {
    const { data } = await gql(await createViewer(), ALERTS);
    expect(data.bots[0].alerts).toEqual([]);
  });
  it('asks an unavailable Bacen once, not once per Operation or per request', async () => {
    // Past the 6 hours the rates of the other tests stay cached for.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const failing = failingMarketRatesHandler();
    mswServer.use(failing.handler);
    const viewer = await createViewer();
    await operation(viewer, 'Um', 0.03, addDays(today(), 20));
    await operation(viewer, 'Dois', 0.05, addDays(today(), 25));

    const first = await gql(viewer, ALERTS);
    expect(first.errors).toEqual([]);
    // No market comparison without the Bacen; only the missing Assessment is pointed out.
    expect(first.data.bots[0].alerts.map((alert: { kind: string }) => alert.kind)).toEqual([
      'STALE_ASSESSMENT',
    ]);
    expect(failing.requests()).toBe(1);

    await gql(viewer, ALERTS);
    expect(failing.requests()).toBe(1);
  });
});
