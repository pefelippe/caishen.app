import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  completionHandler,
  modelListHandler,
  mswServer,
  textOf,
  type Completion,
} from '../../test/msw/openrouter';
import { telegramHandler } from '../../test/msw/telegram';
import app from '../app';
import { toTelegram } from '../services/telegram/api';
import { handleTelegramUpdate, type TelegramUpdate } from '../services/telegram/inbound';

let base = '';
let close: () => void;

beforeAll(async () => {
  mswServer.listen();
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

let updateId = Math.floor(Math.random() * 1e9);
const newChat = () => Math.floor(Math.random() * 1e12);
const text = (chat: number, body: string): TelegramUpdate => ({
  message: { chat: { id: chat, type: 'private' }, text: body },
  update_id: ++updateId,
});
const press = (chat: number, data: string): TelegramUpdate => ({
  callback_query: { data, id: `cb-${updateId}`, message: { chat: { id: chat, type: 'private' } } },
  update_id: ++updateId,
});

/** Delivers updates one by one; returns what the server sent back. */
async function deliver(updates: TelegramUpdate[], completions: Completion[] = []) {
  const telegram = telegramHandler();
  const { handler, log } = completionHandler(completions);
  mswServer.use(telegram.handler, modelListHandler, handler);
  for (const update of updates) await handleTelegramUpdate(update);
  return { log, sent: telegram.sent };
}

/** A User with `chat` linked through the start link, as the Integrações page does it. */
async function linked(chat = newChat()): Promise<{ chat: number; viewer: Viewer }> {
  const viewer = await createViewer();
  const { url } = (await gql(viewer, `mutation { startTelegramLink { url } }`)).data
    .startTelegramLink;
  expect(url).toMatch(/^https:\/\/t\.me\/CaishenBot\?start=[\w-]{24}$/);
  const code = new URL(url).searchParams.get('start')!;
  const { sent } = await deliver([text(chat, `/start ${code}`)]);
  expect(sent[0]!.text).toContain('conectado');
  return { chat, viewer };
}

describe('Telegram', () => {
  it('takes updates only with our secret', async () => {
    const post = (secret?: string) =>
      fetch(`${base}/api/telegram/webhook`, {
        body: JSON.stringify({ update_id: ++updateId }),
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {}),
        },
        method: 'POST',
      });
    expect((await post()).status).toBe(403);
    expect((await post('wrong')).status).toBe(403);
    expect((await post('test-telegram-secret')).status).toBe(200);
  });

  it('links by the start link once, tells strangers how, and unlinks on /sair', async () => {
    const stranger = newChat();
    expect((await deliver([text(stranger, 'oi')])).sent[0]!.text).toContain('Integrações');
    const stale = await deliver([text(stranger, '/start velho-codigo-qualquer')]);
    expect(stale.sent[0]!.text).toContain('não vale mais');

    const { chat, viewer } = await linked();
    const connections = (await gql(viewer, `{ connections { kind connected } }`)).data.connections;
    expect(connections).toContainEqual({ connected: true, kind: 'TELEGRAM' });

    expect((await deliver([text(chat, '/sair')])).sent[0]!.text).toContain('Desconectei');
    expect((await deliver([text(chat, 'oi')])).sent[0]!.text).toContain('Integrações');
  });

  it('answers in the Telegram Conversation and confirms a Proposal by its button, once', async () => {
    const { chat, viewer } = await linked();
    const update = text(chat, 'gastei 45 no mercado hoje');
    const { log, sent } = await deliver(
      [update],
      [
        {
          arguments: { amount: '45,00', date: '2026-10-22', description: 'Mercado' },
          tool: 'propose_expense',
        },
        { text: 'Anotei o **mercado** <confira>:' },
      ]
    );
    expect(textOf(log[0]!.messages[0])).toContain('Telegram');
    expect(sent[0]!.text).toBe('Anotei o <b>mercado</b> &lt;confira&gt;:');
    expect(sent[1]!.buttons?.map(item => item.title)).toEqual(['Confirmar', 'Cancelar']);

    // The same update delivered again is not answered again.
    expect((await deliver([update])).sent).toEqual([]);

    const confirm = sent[1]!.buttons![0]!.id;
    expect((await deliver([press(chat, confirm)])).sent[0]!.text).toContain('Pronto, gravei');
    expect((await deliver([press(chat, confirm)])).sent[0]!.text).toContain('já foi confirmada');
    // Another chat cannot decide it.
    const other = await linked();
    expect((await deliver([press(other.chat, confirm)])).sent[0]!.text).not.toContain('gravei');

    const expenses = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.organizationId, viewer.organizationId));
    expect(expenses.map(row => row.amountCents)).toEqual([4500]);
    const conversations = await db
      .select({ title: schema.conversation.title })
      .from(schema.conversation)
      .where(
        and(
          eq(schema.conversation.organizationId, viewer.organizationId),
          eq(schema.conversation.channel, 'TELEGRAM')
        )
      );
    expect(conversations).toEqual([{ title: 'Telegram' }]);
  });

  it('ignores groups', async () => {
    const { sent } = await deliver([
      { message: { chat: { id: -100, type: 'group' }, text: 'oi' }, update_id: ++updateId },
    ]);
    expect(sent).toEqual([]);
  });

  it('writes bold as HTML and escapes the rest', () => {
    expect(toTelegram('**R$ 10** & <b>')).toBe('<b>R$ 10</b> &amp; &lt;b&gt;');
  });
});
