import { auth, resolveViewer, type Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { asc, eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { gql } from '../../test/helpers';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import app from '../app';
import { saveAiKey } from '../services/aiKeys';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation, type ChatEvent } from '../services/bots/chat';

const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

let base = '';
let close: () => void;

beforeAll(async () => {
  mswServer.listen({ onUnhandledRequest: 'bypass' });
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  close();
  mswServer.close();
  await closeDb();
});

const CONVERSATION = /* GraphQL */ `
  query ($id: ID!) {
    conversation(id: $id) {
      replying
    }
  }
`;
const STOP = /* GraphQL */ `
  mutation ($id: ID!) {
    stopReply(conversationId: $id)
  }
`;

/** A User signed up through Better Auth, with the session cookie a browser would keep. */
async function signedIn(): Promise<{ cookie: string; viewer: Viewer }> {
  const response = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-up/email`, {
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@test.local`,
        name: 'Ana',
        password: 'senha-forte-123',
      }),
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      method: 'POST',
    })
  );
  const cookie = response.headers
    .getSetCookie()
    .map(line => line.split(';')[0])
    .join('; ');
  const viewer = await resolveViewer(new Headers({ cookie }));
  if (!viewer) throw new Error('No session');
  await saveAiKey(viewer, 'openrouter', 'test-openrouter-key');
  return { cookie, viewer };
}

async function startConversation(viewer: Viewer) {
  const [bot] = await ensureBots(viewer.organizationId);
  const [conversation] = await db
    .insert(schema.conversation)
    .values({ botId: bot!.id, organizationId: viewer.organizationId })
    .returning();
  return conversation!.id;
}

const messagesOf = (conversationId: string) =>
  db
    .select()
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversationId))
    .orderBy(asc(schema.message.createdAt));

/** Waits until `check` holds, looking every 50 ms for up to 5 s. */
async function until(check: () => Promise<boolean>) {
  for (let tries = 0; tries < 100; tries++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out');
}

const replying = async (viewer: Viewer, id: string) =>
  (await gql(viewer, CONVERSATION, { id })).data.conversation.replying as boolean;

describe('Conversa com o Agente', () => {
  it('goes on and is saved when the browser leaves in the middle of the reply', async () => {
    const { cookie, viewer } = await signedIn();
    const conversationId = await startConversation(viewer);
    const { handler } = completionHandler([
      { delayMs: 150, pieces: ['Primeiro, ', 'depois ', 'o fim.'] },
    ]);
    mswServer.use(modelListHandler, handler);

    const leave = new AbortController();
    const response = await fetch(`${base}/api/chat/${conversationId}`, {
      body: JSON.stringify({ content: 'Explique devagar' }),
      headers: { 'content-type': 'application/json', cookie },
      method: 'POST',
      signal: leave.signal,
    });
    // The first piece arrives, then the User goes to another page.
    const reader = response.body!.getReader();
    await reader.read();
    leave.abort();
    expect(await replying(viewer, conversationId)).toBe(true);

    await until(async () => (await messagesOf(conversationId)).length === 2);
    const [, reply] = await messagesOf(conversationId);
    expect(reply).toMatchObject({ content: 'Primeiro, depois o fim.', role: 'BOT' });
    expect(await replying(viewer, conversationId)).toBe(false);
  });

  it('ends with what it has when the User presses Parar', async () => {
    const { viewer } = await signedIn();
    const conversationId = await startConversation(viewer);
    const { handler } = completionHandler([
      { delayMs: 1500, pieces: ['Começando a ', 'resposta longa ', 'que não termina.'] },
    ]);
    mswServer.use(modelListHandler, handler);

    const events: ChatEvent[] = [];
    const reply = replyInConversation({
      content: 'Conte tudo',
      conversationId,
      send: event => events.push(event),
      viewer,
    });
    await until(async () => events.some(event => event.type === 'delta'));
    expect((await gql(viewer, STOP, { id: conversationId })).data.stopReply).toBe(true);
    await reply;

    const [, saved] = await messagesOf(conversationId);
    expect(saved!.content).toBe('Começando a\n\n(Você parou a resposta.)');
    expect(events.some(event => event.type === 'error')).toBe(false);
    expect(events.at(-1)?.type).toBe('done');
    expect(await replying(viewer, conversationId)).toBe(false);
    // With nothing being written, there is nothing to stop.
    expect((await gql(viewer, STOP, { id: conversationId })).data.stopReply).toBe(false);
  });

  it('saves Parar even before the first word, with no error', async () => {
    const { viewer } = await signedIn();
    const conversationId = await startConversation(viewer);
    // Nothing comes until the stop is seen.
    const { handler } = completionHandler([{ delayMs: 3000, pieces: ['', 'tarde demais'] }]);
    mswServer.use(modelListHandler, handler);

    const events: ChatEvent[] = [];
    const reply = replyInConversation({
      content: 'Oi',
      conversationId,
      send: event => events.push(event),
      viewer,
    });
    await until(() => replying(viewer, conversationId));
    await gql(viewer, STOP, { id: conversationId });
    await reply;

    const [, saved] = await messagesOf(conversationId);
    expect(saved).toMatchObject({ content: '(Você parou a resposta.)', role: 'BOT' });
    expect(events.map(event => event.type)).toEqual(['done']);
  });

  it('answers one Message at a time in the app', async () => {
    const { viewer } = await signedIn();
    const conversationId = await startConversation(viewer);
    const { handler } = completionHandler([{ delayMs: 300, pieces: ['Um, ', 'dois.'] }]);
    mswServer.use(modelListHandler, handler);

    const first = replyInConversation({
      content: 'Primeira',
      conversationId,
      send: () => {},
      viewer,
    });
    await until(() => replying(viewer, conversationId));
    await expect(
      replyInConversation({ content: 'Segunda', conversationId, send: () => {}, viewer })
    ).rejects.toThrow('Espere a resposta terminar');
    await first;

    expect((await messagesOf(conversationId)).map(message => message.content)).toEqual([
      'Primeira',
      'Um, dois.',
    ]);
  });

  it('does not show the reply of another Organization as stoppable', async () => {
    const { viewer } = await signedIn();
    const { viewer: stranger } = await signedIn();
    const conversationId = await startConversation(viewer);
    const { handler } = completionHandler([{ delayMs: 300, pieces: ['Só ', 'meu.'] }]);
    mswServer.use(modelListHandler, handler);

    const reply = replyInConversation({ content: 'Oi', conversationId, send: () => {}, viewer });
    await until(() => replying(viewer, conversationId));
    expect((await gql(stranger, STOP, { id: conversationId })).data.stopReply).toBe(false);
    await reply;
    const [, saved] = await messagesOf(conversationId);
    expect(saved!.content).toBe('Só meu.');
  });
});
