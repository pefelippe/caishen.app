import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  completionHandler,
  MODEL_WITHOUT_TOOLS,
  modelListHandler,
  mswServer,
} from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { ChatError, replyInConversation } from '../services/bots/chat';
import { talk } from '../services/models';

beforeAll(() => mswServer.listen());
afterEach(() => {
  mswServer.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const AI_KEYS = /* GraphQL */ `
  query {
    aiKeys {
      provider
      label
      last4
    }
    aiStatus {
      configured
    }
    models {
      id
    }
  }
`;
const SET_KEY = /* GraphQL */ `
  mutation ($provider: AiProvider!, $key: String!) {
    setAiKey(provider: $provider, key: $key) {
      provider
      last4
    }
  }
`;
const REMOVE_KEY = /* GraphQL */ `
  mutation ($provider: AiProvider!) {
    removeAiKey(provider: $provider)
  }
`;

async function conversationOf(organizationId: string) {
  const [bot] = await ensureBots(organizationId);
  const [conversation] = await db
    .insert(schema.conversation)
    .values({ botId: bot!.id, organizationId })
    .returning();
  return conversation!;
}

describe('chaves de IA em Integrações', () => {
  it('keeps the key sealed and shows only its last four characters', async () => {
    mswServer.use(modelListHandler);
    const viewer = await createViewer('Ana', { aiKey: false });

    const before = await gql(viewer, AI_KEYS);
    expect(before.data).toEqual({ aiKeys: [], aiStatus: { configured: false }, models: [] });

    const saved = await gql(viewer, SET_KEY, {
      key: ' sk-ant-secret-1234 ',
      provider: 'ANTHROPIC',
    });
    expect(saved.data.setAiKey).toEqual({ last4: '1234', provider: 'ANTHROPIC' });
    const [row] = await db
      .select()
      .from(schema.aiKey)
      .where(eq(schema.aiKey.organizationId, viewer.organizationId));
    expect(row!.ciphertext).not.toContain('sk-ant-secret');

    const after = await gql(viewer, AI_KEYS);
    expect(after.data.aiKeys).toEqual([
      { label: 'Anthropic', last4: '1234', provider: 'ANTHROPIC' },
    ]);
    expect(after.data.aiStatus.configured).toBe(true);
    expect(after.data.models.map((model: { id: string }) => model.id)).toContain(
      'anthropic:claude-haiku-5-5'
    );

    await gql(viewer, REMOVE_KEY, { provider: 'ANTHROPIC' });
    expect((await gql(viewer, AI_KEYS)).data.aiKeys).toEqual([]);
  });

  it('lets only owners and admins change the keys, and shows them to no other Organization', async () => {
    const owner = await createViewer('Ana', { aiKey: false });
    const memberId = crypto.randomUUID();
    await db
      .insert(schema.user)
      .values({ email: `${memberId}@test.local`, emailVerified: true, id: memberId, name: 'Bia' });
    await db.insert(schema.member).values({
      id: crypto.randomUUID(),
      organizationId: owner.organizationId,
      role: 'member',
      userId: memberId,
    });
    const member = { organizationId: owner.organizationId, role: 'member', userId: memberId };

    const refused = await gql(member, SET_KEY, {
      key: 'sk-or-member-0000',
      provider: 'OPENROUTER',
    });
    expect(refused.errors).toEqual(['FORBIDDEN']);

    await gql(owner, SET_KEY, { key: 'sk-or-owner-9999', provider: 'OPENROUTER' });
    const stranger = await createViewer('Caio', { aiKey: false });
    expect((await gql(stranger, AI_KEYS)).data.aiKeys).toEqual([]);
    expect((await gql(member, AI_KEYS)).data.aiKeys).toHaveLength(1);
  });

  it('refuses something that is not a key', async () => {
    const viewer = await createViewer('Ana', { aiKey: false });
    const { errors } = await gql(viewer, SET_KEY, { key: 'curta', provider: 'OPENAI' });
    expect(errors).toEqual(['BAD_USER_INPUT']);
  });

  it('calls the Model with the Organization’s own key', async () => {
    mswServer.use(modelListHandler);
    const viewer = await createViewer('Ana', { aiKey: false });
    await gql(viewer, SET_KEY, { key: 'sk-or-ana-key-4321', provider: 'OPENROUTER' });
    const { handler, keys } = completionHandler([{ text: 'Oi, Ana!' }]);
    mswServer.use(handler);

    const conversation = await conversationOf(viewer.organizationId);
    await replyInConversation({
      content: 'oi',
      conversationId: conversation.id,
      send: () => undefined,
      viewer,
    });
    expect(keys).toEqual(['sk-or-ana-key-4321']);
  });

  it('asks for a key on Integrações when the Organization has none', async () => {
    const viewer = await createViewer('Ana', { aiKey: false });
    const conversation = await conversationOf(viewer.organizationId);
    const reply = replyInConversation({
      content: 'oi',
      conversationId: conversation.id,
      send: () => undefined,
      viewer,
    });
    await expect(reply).rejects.toThrow(ChatError);
    await expect(reply).rejects.toThrow(/Integrações/);
  });

  it("serves only free Models on the server's OpenRouter key", async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'server-key');
    mswServer.use(modelListHandler);
    const viewer = await createViewer('Ana', { aiKey: false });

    const { data: listed } = await gql(viewer, AI_KEYS);
    expect(listed.aiStatus).toEqual({ configured: true });
    expect(listed.models).not.toContainEqual({ id: MODEL_WITHOUT_TOOLS });

    const { handler, keys } = completionHandler([{ text: 'Oi' }, { text: 'Oi' }]);
    mswServer.use(handler);
    const options = {
      instructions: 'oi',
      messages: [{ content: 'oi', role: 'user' as const }],
      onText: () => undefined,
      toolRounds: 0,
    };
    await talk(viewer.organizationId, 'test/model:free', options);
    expect(keys).toEqual(['server-key']);

    await expect(talk(viewer.organizationId, MODEL_WITHOUT_TOOLS, options)).rejects.toThrow(
      /Este Modelo é pago/
    );
    expect(keys).toEqual(['server-key']);

    // A Bot left on a paid Model answers with a free one (only free ones are listed).
    const [bot] = await ensureBots(viewer.organizationId);
    await db
      .update(schema.bot)
      .set({ model: MODEL_WITHOUT_TOOLS })
      .where(eq(schema.bot.id, bot!.id));
    const { data } = await gql(viewer, `query { bots { model } }`);
    expect(listed.models).toContainEqual({ id: data.bots[0].model });

    // The Organization's own key takes over, paid Models included.
    await gql(viewer, SET_KEY, { key: 'sk-or-ana-own-key', provider: 'OPENROUTER' });
    await talk(viewer.organizationId, MODEL_WITHOUT_TOOLS, options);
    expect(keys).toEqual(['server-key', 'sk-or-ana-own-key']);
  });
});
