import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { asc, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  completionHandler,
  modelListHandler,
  mswServer,
  textOf,
  type Completion,
} from '../../test/msw/openrouter';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const CONFIRM = /* GraphQL */ `
  mutation ($id: ID!) {
    confirmProposal(id: $id) {
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
  return conversation!.id;
}

/** Sends `content` (or answers the last Message again, with `redo`); returns the Model's log. */
async function say(
  viewer: Viewer,
  conversationId: string,
  content: string,
  completions: Completion[],
  redo?: 'edit' | 'retry'
) {
  const { handler, log } = completionHandler(completions);
  mswServer.use(modelListHandler, handler);
  const errors: string[] = [];
  await replyInConversation({
    content,
    conversationId,
    redo,
    send: event => {
      if (event.type === 'error') errors.push(event.message);
    },
    viewer,
  }).catch((error: Error) => errors.push(error.message));
  return { errors, log };
}

const messagesOf = async (conversationId: string) =>
  (
    await db
      .select()
      .from(schema.message)
      .where(eq(schema.message.conversationId, conversationId))
      .orderBy(asc(schema.message.createdAt))
  ).map(({ content, role }) => `${role}: ${content}`);

const proposalsOf = (conversationId: string) =>
  db.select().from(schema.proposal).where(eq(schema.proposal.conversationId, conversationId));

describe('Tentar de novo e editar no chat', () => {
  it('answers the last Message again in place of its reply', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);
    await say(viewer, conversationId, 'Oi', [{ text: 'Olá!' }]);
    await say(viewer, conversationId, 'Quanto gastei?', [{ text: 'Resposta ruim.' }]);

    const { errors, log } = await say(
      viewer,
      conversationId,
      '',
      [{ text: 'R$ 100,00.' }],
      'retry'
    );

    expect(errors).toEqual([]);
    expect(await messagesOf(conversationId)).toEqual([
      'USER: Oi',
      'BOT: Olá!',
      'USER: Quanto gastei?',
      'BOT: R$ 100,00.',
    ]);
    // The Model sees the question once, and not the reply taken back.
    const sent = log[0]!.messages.map(textOf);
    expect(sent.filter(text => text === 'Quanto gastei?')).toHaveLength(1);
    expect(sent.some(text => text.includes('Resposta ruim.'))).toBe(false);
  });

  it('answers the edited Message in place of the old one', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);
    await say(viewer, conversationId, 'Quanto gastei em outubro?', [{ text: 'Em outubro…' }]);

    const { log } = await say(
      viewer,
      conversationId,
      'Quanto gastei em setembro?',
      [{ text: 'Em setembro…' }],
      'edit'
    );

    expect(await messagesOf(conversationId)).toEqual([
      'USER: Quanto gastei em setembro?',
      'BOT: Em setembro…',
    ]);
    expect(textOf(log[0]!.messages.at(-1))).toBe('Quanto gastei em setembro?');
  });

  it('answers again after a reply that failed', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);
    const failed = await say(viewer, conversationId, 'Oi', [{ status: 500 }]);
    expect(failed.errors).toHaveLength(1);
    expect(await messagesOf(conversationId)).toEqual(['USER: Oi']);

    await say(viewer, conversationId, '', [{ text: 'Agora sim.' }], 'retry');
    expect(await messagesOf(conversationId)).toEqual(['USER: Oi', 'BOT: Agora sim.']);
  });

  it('takes the pending Proposals of the old reply with it', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);
    await say(viewer, conversationId, 'Adicione o empréstimo do Itaú', [
      { arguments: LOAN, tool: 'propose_credit_operation' },
      { text: 'Confira abaixo e confirme.' },
    ]);
    expect(await proposalsOf(conversationId)).toHaveLength(1);

    await say(viewer, conversationId, '', [{ text: 'Melhor não.' }], 'retry');
    expect(await proposalsOf(conversationId)).toEqual([]);
  });

  it('keeps a reply whose Proposal was already confirmed', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);
    await say(viewer, conversationId, 'Adicione o empréstimo do Itaú', [
      { arguments: LOAN, tool: 'propose_credit_operation' },
      { text: 'Confira abaixo e confirme.' },
    ]);
    const [proposal] = await proposalsOf(conversationId);
    await gql(viewer, CONFIRM, { id: proposal!.id });

    const { errors } = await say(viewer, conversationId, '', [], 'retry');
    expect(errors).toEqual([
      'Esta resposta já tem uma proposta confirmada ou cancelada. Mande uma nova mensagem.',
    ]);
    expect(await messagesOf(conversationId)).toEqual([
      'USER: Adicione o empréstimo do Itaú',
      'BOT: Confira abaixo e confirme.',
    ]);
    // The Conversation is free for the next Message.
    const next = await say(viewer, conversationId, 'Obrigado', [{ text: 'De nada.' }]);
    expect(next.errors).toEqual([]);
  });
});
