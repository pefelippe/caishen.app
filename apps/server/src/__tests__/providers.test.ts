import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { anthropicHandler } from '../../test/msw/anthropic';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';
import { ModelError } from '../services/models';

beforeAll(() => mswServer.listen());
beforeEach(() => vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key'));
afterEach(() => {
  mswServer.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const MODELS = /* GraphQL */ `
  query {
    models {
      id
    }
  }
`;
const SET_MODEL = /* GraphQL */ `
  mutation ($id: ID!, $model: String) {
    setBotModel(id: $id, model: $model) {
      model
    }
  }
`;

describe('Modelos de outros provedores', () => {
  it('lists the direct Models of a provider whose key is set, and lets a Bot use one', async () => {
    mswServer.use(modelListHandler);
    const viewer = await createViewer();
    const [bot] = await ensureBots(viewer.organizationId);

    const { data } = await gql(viewer, MODELS);
    const ids = data.models.map((model: { id: string }) => model.id);
    expect(ids).toContain('anthropic:claude-haiku-5-5');
    expect(ids.some((id: string) => id.startsWith('openai:'))).toBe(false);

    const set = await gql(viewer, SET_MODEL, { id: bot!.id, model: 'anthropic:claude-haiku-5-5' });
    expect(set.data.setBotModel.model).toBe('anthropic:claude-haiku-5-5');
  });

  it('talks to Anthropic straight, with the server key and the Caishen’s tools', async () => {
    mswServer.use(modelListHandler);
    const viewer = await createViewer();
    const [bot] = await ensureBots(viewer.organizationId);
    await db
      .update(schema.bot)
      .set({ model: 'anthropic:claude-haiku-5-5' })
      .where(eq(schema.bot.id, bot!.id));
    const [conversation] = await db
      .insert(schema.conversation)
      .values({ botId: bot!.id, organizationId: viewer.organizationId })
      .returning();
    const { handler, log } = anthropicHandler('Olá! Como estão as contas?');
    mswServer.use(handler);

    const done: string[] = [];
    await replyInConversation({
      content: 'oi',
      conversationId: conversation!.id,
      send: event => {
        if (event.type === 'done') done.push(event.message.content);
      },
      viewer,
    });

    expect(log).toHaveLength(1);
    expect(log[0]!.apiKey).toBe('test-anthropic-key');
    expect(log[0]!.body.model).toBe('claude-haiku-5-5');
    expect(JSON.stringify(log[0]!.body.system)).toContain('Você é Caishen');
    expect(log[0]!.body.tools?.map(tool => tool.name)).toContain('period_summary');
    expect(done).toEqual(['Olá! Como estão as contas?']);
  });
  it('sends the app’s note on a Proposal to Anthropic inside a user turn', async () => {
    const viewer = await createViewer();
    const [bot] = await ensureBots(viewer.organizationId);
    const [conversation] = await db
      .insert(schema.conversation)
      .values({ botId: bot!.id, organizationId: viewer.organizationId })
      .returning();
    const first = completionHandler([
      {
        arguments: { amount: '50,00', date: '2026-10-22', description: 'Açaí' },
        tool: 'propose_expense',
      },
      { text: 'Confira abaixo.' },
    ]);
    mswServer.use(modelListHandler, first.handler);
    await replyInConversation({
      content: 'Gastei 50 no açaí',
      conversationId: conversation!.id,
      send: () => {},
      viewer,
    });

    await db
      .update(schema.bot)
      .set({ model: 'anthropic:claude-haiku-5-5' })
      .where(eq(schema.bot.id, bot!.id));
    const { handler, log } = anthropicHandler('Anotado.');
    mswServer.use(handler);
    const errors: string[] = [];
    await replyInConversation({
      content: 'e agora?',
      conversationId: conversation!.id,
      send: event => {
        if (event.type === 'error') errors.push(event.message);
      },
      viewer,
    });

    expect(errors).toEqual([]);
    expect(log).toHaveLength(1);
    const note = log[0]!.body.messages.find(message =>
      JSON.stringify(message.content).includes('Nota do app')
    );
    expect(note?.role).toBe('user');
  });

  it('stops on an abort before the first token, without a second request', async () => {
    const viewer = await createViewer();
    const [bot] = await ensureBots(viewer.organizationId);
    await db
      .update(schema.bot)
      .set({ model: 'anthropic:claude-haiku-5-5' })
      .where(eq(schema.bot.id, bot!.id));
    const [conversation] = await db
      .insert(schema.conversation)
      .values({ botId: bot!.id, organizationId: viewer.organizationId })
      .returning();
    const { handler, log } = anthropicHandler('Olá!');
    mswServer.use(modelListHandler, handler);

    const errors: string[] = [];
    const error = await replyInConversation({
      content: 'oi',
      conversationId: conversation!.id,
      send: event => {
        if (event.type === 'error') errors.push(event.message);
      },
      signal: AbortSignal.abort(),
      viewer,
    }).catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(ModelError);
    expect(errors.some(message => message.includes('O Modelo não respondeu'))).toBe(false);
    expect(log.length).toBeLessThanOrEqual(1);
  });
});
