import { db, schema } from '@zapbots/database';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { marketRatesHandler } from '../../test/msw/bacen';
import {
  completionHandler,
  MODEL_WITHOUT_TOOLS,
  modelListHandler,
  mswServer,
} from '../../test/msw/openrouter';
import { replyInConversation, type ChatEvent } from '../services/bots/chat';
import { ModelError } from '../services/models';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

type Viewer = Awaited<ReturnType<typeof createViewer>>;

/** Starts a Conversation with Caishen and returns a function that sends Messages. */
async function conversationWithCaishen(viewer: Viewer) {
  const { data } = await gql(viewer, `{ bot(key: FINANCE) { id } }`);
  const started = await gql(
    viewer,
    `mutation ($id: ID!) { startConversation(botId: $id) { id } }`,
    { id: data.bot.id }
  );
  const conversationId: string = started.data.startConversation.id;
  const say = async (content: string) => {
    const events: ChatEvent[] = [];
    await replyInConversation({
      content,
      conversationId,
      send: event => events.push(event),
      viewer,
    });
    return events;
  };
  const messages = async () => {
    const result = await gql(
      viewer,
      `query ($id: ID!) { conversation(id: $id) { title messages { role content } } }`,
      { id: conversationId }
    );
    return result.data.conversation;
  };
  return { botId: data.bot.id as string, conversationId, messages, say };
}

describe('caishen', () => {
  it('puts Caishen on every team, with its name and personality from the catalog', async () => {
    const viewer = await createViewer();
    const first = await gql(viewer, `{ bots { id key name model } }`);
    const again = await gql(viewer, `{ bots { id } }`);
    expect(first.data.bots).toEqual([
      { id: expect.any(String), key: 'FINANCE', model: 'test/with-tools', name: 'Caishen' },
    ]);
    expect(again.data.bots).toEqual([{ id: first.data.bots[0].id }]);
  });

  it('gives the User a Holder of their own, adopting the oldest one when the Organization has any', async () => {
    const fresh = await createViewer('Bruna');
    const first = await gql(fresh, `{ viewerHolder { id name } }`);
    const again = await gql(fresh, `{ viewerHolder { id } }`);
    expect(first.data.viewerHolder.name).toBe('Bruna');
    expect(again.data.viewerHolder.id).toBe(first.data.viewerHolder.id);

    const legacy = await createViewer('Caio');
    const [existing] = await db
      .insert(schema.holder)
      .values({ name: 'Titular antigo', organizationId: legacy.organizationId })
      .returning();
    const adopted = await gql(legacy, `{ viewerHolder { id name } }`);
    expect(adopted.data.viewerHolder).toEqual({ id: existing!.id, name: 'Titular antigo' });
  });

  it('answers from the finance data, already formatted, and offers the Model no tools', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    await gql(
      viewer,
      `mutation ($holderId: ID!) {
        addIncomeSource(input: {
          holderId: $holderId, description: "Salário", monthlyNetCents: 500000, startsOn: "2020-01-01"
        }) { id }
      }`,
      { holderId: holder.data.viewerHolder.id }
    );
    const chat = await conversationWithCaishen(viewer);
    const { handler, log } = completionHandler([{ text: 'Sua renda é R$ 5.000,00.' }]);
    mswServer.use(handler);

    const events = await chat.say('Quanto eu ganho por mês?');

    expect(events.map(event => event.type)).toEqual(['delta', 'delta', 'done']);
    expect(await chat.messages()).toEqual({
      messages: [
        { content: 'Quanto eu ganho por mês?', role: 'USER' },
        { content: 'Sua renda é R$ 5.000,00.', role: 'BOT' },
      ],
      title: 'Quanto eu ganho por mês?',
    });
    const system = log[0]!.messages[0]!.content!;
    expect(system).toContain('Você é Caishen, um Bot do zapbots.');
    expect(system).toContain('Renda mensal líquida: R$ 5.000,00');
    expect(log[0]!.tools).toBeUndefined();

    // The list of Conversations with the whole team shows each one's latest Message.
    const list = await gql(
      viewer,
      `{ conversations { title bot { key } lastMessage { role content } } }`
    );
    expect(list.data.conversations).toEqual([
      {
        bot: { key: 'FINANCE' },
        lastMessage: { content: 'Sua renda é R$ 5.000,00.', role: 'BOT' },
        title: 'Quanto eu ganho por mês?',
      },
    ]);
    const intruder = await gql(await createViewer('Davi'), `{ conversations { id } }`);
    expect(intruder.data.conversations).toEqual([]);
  });

  it('gives the Model what is left to pay and a computed Extra Amortization, ranked by rate', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const create = (name: string, monthlyRate: number) =>
      gql(
        viewer,
        `mutation ($holderId: ID!, $name: String!, $monthlyRate: Float!) {
          createCreditOperation(input: {
            holderId: $holderId, name: $name, modality: PERSONAL_LOAN, system: PRICE,
            principalCents: 1200000, termMonths: 12, firstDueDate: "2030-01-10", monthlyRate: $monthlyRate
          }) { id }
        }`,
        { holderId: holder.data.viewerHolder.id, monthlyRate, name }
      );
    await create('Carro', 0.015);
    await create('Pessoal', 0.04);
    const chat = await conversationWithCaishen(viewer);
    const { handler, log } = completionHandler([{ text: 'Comece pelo Pessoal.' }]);
    mswServer.use(
      handler,
      marketRatesHandler({ 'Crédito pessoal não consignado - Prefixado': [5.5, 6, 6.5] })
    );

    await chat.say('Qual eu quito primeiro?');

    const system = log[0]!.messages[0]!.content!;
    expect(system).toContain('Da maior para a menor taxa: Pessoal, Carro.');
    expect(system).toContain(
      'taxa 2,00 ponto(s) percentual(is) abaixo da Taxa Média de Mercado (6,00% a.m., mediana de 3 instituições, Bacen, 2026-10-01)'
    );
    expect(system).toContain('taxa 4,00% a.m.');
    expect(system).toMatch(
      /Pessoal \(.*\): .*faltam 12 Parcelas até 10\/12\/2030 e R\$ [\d.,]+ de juros/
    );
    expect(system).toContain(
      'Se pagar uma Amortização Extraordinária de R$ 1.000,00 amanhã, em cada Operação:'
    );
    expect(system).toMatch(
      /Plano de Quitação com R\$\s1\.000,00 por mês a mais, sempre na Operação de maior taxa: sem dívidas em \d{2}\/\d{2}\/\d{4} em vez de 10\/12\/2030, economizando R\$\s[\d.,]+ de juros\. Ordem: Pessoal \(\d{2}\/\d{2}\/\d{4}\), Carro \(\d{2}\/\d{2}\/\d{4}\)\./
    );

    // An Operation that ended years ago has nothing left to plan.
    await gql(
      viewer,
      `mutation ($holderId: ID!) {
        createCreditOperation(input: {
          holderId: $holderId, name: "Antigo", modality: PERSONAL_LOAN, system: PRICE,
          principalCents: 100000, termMonths: 12, firstDueDate: "2020-01-10", monthlyRate: 0.09
        }) { id }
      }`,
      { holderId: holder.data.viewerHolder.id }
    );
    const plan = await gql(
      viewer,
      `query ($id: ID!) {
        holder(id: $id) {
          payoffPlan(monthlyExtraCents: 100000) { debtFreeOn interestSavedCents payoffs { name } }
        }
      }`,
      { id: holder.data.viewerHolder.id }
    );
    expect(plan.data.holder.payoffPlan.payoffs).toEqual([{ name: 'Pessoal' }, { name: 'Carro' }]);
    expect(plan.data.holder.payoffPlan.interestSavedCents).toBeGreaterThan(0);
    const refused = await gql(
      viewer,
      `query ($id: ID!) { holder(id: $id) { payoffPlan(monthlyExtraCents: 0) { debtFreeOn } } }`,
      { id: holder.data.viewerHolder.id }
    );
    expect(refused.errors).toEqual(['BAD_USER_INPUT']);
    expect(system).toMatch(/- Pessoal: economiza R\$ [\d.,]+ de juros e \d+ Parcela\(s\)/);
  });

  it('gives the Model the recent Statements of each Card and the Indicators of the Assessment', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const holderId: string = holder.data.viewerHolder.id;
    const setup = await gql(
      viewer,
      `mutation ($holderId: ID!) {
        addIncomeSource(input: {
          holderId: $holderId, description: "Salário", monthlyNetCents: 500000, startsOn: "2020-01-01"
        }) { id }
        createCreditCard(input: {
          holderId: $holderId, name: "Nubank", limitCents: 1000000, closingDay: 3, dueDay: 10
        }) { id }
      }`,
      { holderId }
    );
    const cardId: string = setup.data.createCreditCard.id;
    for (const [referenceMonth, amountCents] of [
      ['2026-07', 150_000],
      ['2026-08', 210_000],
      ['2026-09', 180_000],
      ['2026-10', 120_000],
    ] as const) {
      await gql(
        viewer,
        `mutation ($input: UpsertStatementInput!) { upsertStatement(input: $input) { id } }`,
        { input: { amountCents, creditCardId: cardId, referenceMonth } }
      );
    }
    const generated = await gql(
      viewer,
      `mutation ($holderId: ID!) { generateAssessment(holderId: $holderId) { score } }`,
      { holderId }
    );
    expect(generated.errors).toEqual([]);
    const chat = await conversationWithCaishen(viewer);
    const { handler, log } = completionHandler([{ text: 'Tudo certo.' }]);
    mswServer.use(handler);

    await chat.say('Como está meu cartão?');

    const system = log[0]!.messages[0]!.content!;
    expect(system).toContain(
      'Faturas mais recentes: 10/2026 R$ 1.200,00, 09/2026 R$ 1.800,00, 08/2026 R$ 2.100,00'
    );
    expect(system).not.toContain('07/2026 R$');
    expect(system).toContain('Indicadores da última Avaliação:');
    expect(system).toContain('- Capacidade de Pagamento: R$');
    expect(system).toContain('- Limite Sugerido: R$ 1.500,00');
    expect(system).toMatch(/- Utilização de Limite: [\d,]+%/);
  });

  it('tells the Model how the Score moved since the previous Assessment, by component', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const assessment = (score: number, breakdown: object, daysAgo: number) => ({
      band: 'MEDIUM' as const,
      breakdown,
      createdAt: new Date(Date.now() - daysAgo * 86_400_000),
      holderId: holder.data.viewerHolder.id,
      indicators: {},
      modelVersion: 'test',
      score,
    });
    await db
      .insert(schema.assessment)
      .values([
        assessment(540, { capacity: 140, punctuality: 300, utilization: 100 }, 40),
        assessment(585, { capacity: 160, punctuality: 300, utilization: 125 }, 1),
      ]);
    const chat = await conversationWithCaishen(viewer);
    const { handler, log } = completionHandler([{ text: 'Subiu.' }]);
    mswServer.use(handler);

    await chat.say('Meu Score melhorou?');

    expect(log[0]!.messages[0]!.content).toMatch(
      /Score subiu 45 pontos desde a Avaliação de \d{2}\/\d{2}\/\d{4} \(era 540\): capacidade \+20, utilização \+25\./
    );
    // These Assessments carry no Indicators, as old scoring models may not: nothing reads "NaN".
    expect(log[0]!.messages[0]!.content).not.toContain('NaN');
    expect(log[0]!.messages[0]!.content).toContain('Capacidade de Pagamento: sem dado por mês');

    // Under a new scoring model, components are not compared.
    await db.insert(schema.assessment).values({
      ...assessment(600, { capacity: 200, punctuality: 300, utilization: 100 }, 0),
      modelVersion: 'test-2',
    });
    const second = completionHandler([{ text: 'Mudou a regra.' }]);
    mswServer.use(second.handler);
    await chat.say('E agora?');
    const system = second.log[0]!.messages[0]!.content!;
    expect(system).toMatch(
      /Score 600, era 585 na Avaliação de \d{2}\/\d{2}\/\d{4}; a regra de pontuação mudou entre as duas/
    );
    expect(system).not.toContain('capacidade +');
  });

  it('remembers its latest Deliverables in a Conversation, and says the data wins over them', async () => {
    const viewer = await createViewer();
    const chat = await conversationWithCaishen(viewer);
    const finishedAt = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);
    await db.insert(schema.job).values(
      [
        { deliverable: 'Plano antigo.', finishedAt: finishedAt(9), instructions: 'Primeiro' },
        { deliverable: 'Plano do meio.', finishedAt: finishedAt(6), instructions: 'Segundo' },
        { deliverable: 'Plano recente.', finishedAt: finishedAt(3), instructions: 'Terceiro' },
        { deliverable: 'Plano novo.', finishedAt: finishedAt(1), instructions: 'Quarto' },
        {
          error: 'Falhou.',
          finishedAt: finishedAt(0),
          instructions: 'Falho',
          status: 'FAILED' as const,
        },
      ].map(job => ({
        status: 'DONE' as const,
        ...job,
        botId: chat.botId,
        organizationId: viewer.organizationId,
      }))
    );
    const { handler, log } = completionHandler([{ text: 'Claro.' }]);
    mswServer.use(handler);

    await chat.say('Explique o plano que você me mandou');

    const system = log[0]!.messages[0]!.content!;
    const section = system.slice(system.indexOf('## Entregas anteriores'));
    expect(section).toContain('valem os dados acima');
    expect(section).toMatch(/### \d{2}\/\d{2}\/\d{4}: Quarto\nPlano novo\./);
    expect(section.indexOf('Quarto')).toBeLessThan(section.indexOf('Segundo'));
    expect(section).not.toContain('Primeiro');
    expect(section).not.toContain('Falho');
  });

  it('uses the Model chosen for Caishen and refuses one that does not exist', async () => {
    const viewer = await createViewer();
    const chat = await conversationWithCaishen(viewer);
    const pick = (model: string | null) =>
      gql(
        viewer,
        `mutation ($id: ID!, $model: String) { setBotModel(id: $id, model: $model) { model } }`,
        { id: chat.botId, model }
      );

    expect((await pick(MODEL_WITHOUT_TOOLS)).data.setBotModel).toEqual({
      model: MODEL_WITHOUT_TOOLS,
    });
    const { handler, log } = completionHandler([{ text: 'Olá.' }]);
    mswServer.use(handler);
    await chat.say('Oi');
    expect(log[0]!.model).toBe(MODEL_WITHOUT_TOOLS);

    expect((await pick('nope/unknown')).errors).toEqual(['BAD_USER_INPUT']);
    expect((await pick(null)).data.setBotModel).toEqual({ model: 'test/with-tools' });
  });

  it('explains a rate limit and keeps the User’s Message', async () => {
    const viewer = await createViewer();
    const chat = await conversationWithCaishen(viewer);
    mswServer.use(completionHandler([{ status: 429 }]).handler);

    const failure = chat.say('Como estão minhas dívidas?');
    await expect(failure).rejects.toBeInstanceOf(ModelError);
    await expect(failure).rejects.toThrow(/limite/);
    expect((await chat.messages()).messages).toEqual([
      { content: 'Como estão minhas dívidas?', role: 'USER' },
    ]);
  });

  it('keeps one Organization from reading or changing another one’s Bot and Conversations', async () => {
    const owner = await createViewer();
    const intruder = await createViewer('Davi');
    const chat = await conversationWithCaishen(owner);
    const ids = { bot: chat.botId, conversation: chat.conversationId };

    const refused = (operation: string) =>
      gql(
        intruder,
        // Ids are written into the text: unused variables would fail validation.
        operation.replace(/\$(\w+)/g, (_, name: keyof typeof ids) => JSON.stringify(ids[name]))
      );
    for (const operation of [
      'mutation { setBotModel(id: $bot, model: null) { id } }',
      'mutation { startConversation(botId: $bot) { id } }',
      '{ conversations(botId: $bot) { id } }',
    ]) {
      expect((await refused(operation)).errors, operation).toEqual(['NOT_FOUND']);
    }
    expect((await refused('mutation { deleteConversation(id: $conversation) }')).data).toEqual({
      deleteConversation: false,
    });
    expect((await refused('{ conversation(id: $conversation) { id } }')).data).toEqual({
      conversation: null,
    });
    const chatAttempt = replyInConversation({
      content: 'oi',
      conversationId: ids.conversation,
      send: () => undefined,
      viewer: intruder,
    });
    await expect(chatAttempt).rejects.toThrow('Conversa não encontrada.');

    const kept = await gql(owner, `{ conversations(botId: "${ids.bot}") { id } }`);
    expect(kept.data.conversations).toEqual([{ id: ids.conversation }]);
  });

  it('shortens the schedule with an Extra Amortization and refuses one above the balance', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const created = await gql(
      viewer,
      `mutation ($holderId: ID!) {
        createCreditOperation(input: {
          holderId: $holderId, name: "Carro", modality: VEHICLE_FINANCING, system: PRICE,
          principalCents: 1200000, termMonths: 12, firstDueDate: "2030-01-10", monthlyRate: 0.02
        }) { id schedule { number } }
      }`,
      { holderId: holder.data.viewerHolder.id }
    );
    const id: string = created.data.createCreditOperation.id;
    expect(created.data.createCreditOperation.schedule).toHaveLength(12);

    const add = (as: Viewer, amountCents: number, date = '2030-02-15') =>
      gql(
        as,
        `mutation ($id: ID!, $date: Date!, $amountCents: Cents!) {
          addExtraAmortization(creditOperationId: $id, date: $date, amountCents: $amountCents) {
            schedule { number }
            extraAmortizations { id date amountCents }
          }
        }`,
        { amountCents, date, id }
      );

    const added = await add(viewer, 500_000);
    const operation = added.data.addExtraAmortization;
    expect(operation.extraAmortizations).toMatchObject([
      { amountCents: 500_000, date: '2030-02-15' },
    ]);
    expect(operation.schedule.length).toBeLessThan(12);

    const simulate = (amountCents: number) =>
      gql(
        viewer,
        `query ($id: ID!, $amountCents: Cents!) {
          creditOperation(id: $id) { prepayment(amountCents: $amountCents) { interestSavedCents installmentsSaved } }
        }`,
        { amountCents, id }
      );
    const simulated = (await simulate(100_000)).data.creditOperation.prepayment;
    expect(simulated.interestSavedCents).toBeGreaterThan(0);
    expect(simulated.installmentsSaved).toBeGreaterThanOrEqual(0);
    expect((await simulate(0)).errors).toEqual(['BAD_USER_INPUT']);

    expect((await add(viewer, 99_000_000)).errors).toEqual(['BAD_USER_INPUT']);
    expect((await add(viewer, 100, '2029-12-31')).errors).toEqual(['BAD_USER_INPUT']);
    expect((await add(await createViewer('Davi'), 100)).errors).toEqual(['NOT_FOUND']);

    const removed = await gql(
      viewer,
      `mutation ($id: ID!) { removeExtraAmortization(id: $id) { schedule { number } } }`,
      { id: operation.extraAmortizations[0].id }
    );
    expect(removed.data.removeExtraAmortization.schedule).toHaveLength(12);
  });
});
