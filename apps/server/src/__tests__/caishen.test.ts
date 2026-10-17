import { db, schema } from '@zapbots/database';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
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
