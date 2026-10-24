import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { metaHandler } from '../../test/msw/meta';
import {
  completionHandler,
  modelListHandler,
  mswServer,
  type Completion,
} from '../../test/msw/openrouter';
import app from '../app';
import { handleWebhook, type InboundMessage } from '../services/whatsapp/inbound';
import { splitText } from '../services/whatsapp/meta';

let base = '';
let close: () => void;

beforeAll(async () => {
  mswServer.listen();
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
// Each test starts the month with the cap untouched.
beforeEach(async () => {
  await db.delete(schema.whatsappUsage);
  delete process.env.WHATSAPP_MONTHLY_CAP;
});
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  close();
  mswServer.close();
  await closeDb();
});

const START = /* GraphQL */ `
  mutation {
    startWhatsappLink {
      code
      url
    }
  }
`;
const LINK = /* GraphQL */ `
  query {
    whatsappLink {
      phone
    }
  }
`;

/** A phone of its own for each test, so links and the "told once" hash never collide. */
const newPhone = () => `55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

let wamid = 0;
const text = (from: string, body: string): InboundMessage => ({
  from,
  id: `wamid.in-${++wamid}-${Math.random()}`,
  text: { body },
  type: 'text',
});
const button = (from: string, id: string): InboundMessage => ({
  from,
  id: `wamid.in-${++wamid}-${Math.random()}`,
  interactive: { button_reply: { id, title: 'Confirmar' }, type: 'button_reply' },
  type: 'interactive',
});

/** Delivers messages as one webhook payload; returns what the server sent back. */
async function deliver(messages: InboundMessage[], completions: Completion[] = []) {
  const meta = metaHandler();
  const { handler, log } = completionHandler(completions);
  mswServer.use(meta.handler, modelListHandler, handler);
  await handleWebhook({
    entry: [{ changes: [{ field: 'messages', value: { messages } }] }],
    object: 'whatsapp_business_account',
  });
  return { log, sent: meta.sent };
}

/** A User with `phone` linked through a code, as the Integrações page does it. */
async function linked(phone = newPhone()): Promise<{ phone: string; viewer: Viewer }> {
  const viewer = await createViewer();
  const { data } = await gql(viewer, START);
  const { sent } = await deliver([
    text(phone, `Conectar ao Caishen: ${data.startWhatsappLink.code}`),
  ]);
  expect(sent[0]!.text).toContain('conectado');
  return { phone, viewer };
}

const sign = (body: string, secret = 'test-app-secret') =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('the webhook', () => {
  it('answers Meta’s check only with our verify token', async () => {
    const good = await fetch(
      `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=42`
    );
    expect(good.status).toBe(200);
    expect(await good.text()).toBe('42');
    const bad = await fetch(
      `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42`
    );
    expect(bad.status).toBe(403);
  });

  it('refuses a body not signed with the App Secret', async () => {
    const body = JSON.stringify({ entry: [], object: 'whatsapp_business_account' });
    const post = (signature: string) =>
      fetch(`${base}/api/whatsapp/webhook`, {
        body,
        headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
        method: 'POST',
      });
    expect((await post(sign(body, 'someone-else'))).status).toBe(403);
    expect((await post('sha256=abc')).status).toBe(403);
    expect((await post(sign(body))).status).toBe(200);
  });

  it('handles a message Meta delivers twice only once', async () => {
    const phone = newPhone();
    const message = text(phone, 'oi');
    const { sent } = await deliver([message, message]);
    expect(sent).toHaveLength(1);
    expect((await deliver([message])).sent).toHaveLength(0);
  });
});

describe('linking a number', () => {
  it('tells an unknown number how to link once, and keeps neither the number nor the text', async () => {
    const phone = newPhone();
    const first = await deliver([text(phone, 'quanto eu gastei?')]);
    expect(first.sent).toHaveLength(1);
    expect(first.sent[0]!.text).toContain('Integrações');
    expect(first.log).toHaveLength(0);
    expect((await deliver([text(phone, 'oi?')])).sent).toHaveLength(0);

    const strangers = await db.select().from(schema.whatsappStranger);
    expect(strangers.some(row => row.phoneHash.includes(phone))).toBe(false);
  });

  it('links with a good code, once, and shows only the last digits', async () => {
    const { phone, viewer } = await linked();
    const { data } = await gql(viewer, LINK);
    expect(data.whatsappLink.phone).toBe(`…${phone.slice(-4)}`);

    // The same code from another number links nothing.
    const [code] = await db
      .select()
      .from(schema.whatsappLinkCode)
      .where(eq(schema.whatsappLinkCode.userId, viewer.userId));
    const other = newPhone();
    const { sent } = await deliver([text(other, code!.code)]);
    expect(sent[0]!.text).toContain('não vale mais');
    expect((await gql(viewer, LINK)).data.whatsappLink.phone).toBe(`…${phone.slice(-4)}`);
  });

  it('refuses an expired code', async () => {
    const viewer = await createViewer();
    const { data } = await gql(viewer, START);
    await db
      .update(schema.whatsappLinkCode)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.whatsappLinkCode.code, data.startWhatsappLink.code));
    const { sent } = await deliver([text(newPhone(), data.startWhatsappLink.code)]);
    expect(sent[0]!.text).toContain('não vale mais');
    expect((await gql(viewer, LINK)).data.whatsappLink).toBeNull();
  });

  it('unlinks on SAIR', async () => {
    const { phone, viewer } = await linked();
    const { sent } = await deliver([text(phone, 'SAIR')]);
    expect(sent[0]!.text).toContain('Desconectei');
    expect((await gql(viewer, LINK)).data.whatsappLink).toBeNull();
  });
});

describe('talking to the Caishen', () => {
  it('answers in text and sends a Proposal with buttons that write it once', async () => {
    const { phone, viewer } = await linked();
    const { log, sent } = await deliver(
      [text(phone, 'gastei 45 no mercado hoje')],
      [
        {
          arguments: { amount: '45,00', date: '2026-10-22', description: 'Mercado' },
          tool: 'propose_expense',
        },
        { text: 'Anotei o **mercado**, confira:' },
      ]
    );
    // The WhatsApp rules are in the prompt.
    expect(String(log[0]!.messages[0]!.content)).toContain('WhatsApp');
    expect(sent[0]!.text).toBe('Anotei o *mercado*, confira:');
    expect(sent[1]!.text).toContain('Adicionar Gasto');
    expect(sent[1]!.buttons?.map(item => item.title)).toEqual(['Confirmar', 'Cancelar']);

    const confirm = sent[1]!.buttons![0]!.id;
    expect((await deliver([button(phone, confirm)])).sent[0]!.text).toContain('Pronto, gravei');
    expect((await deliver([button(phone, confirm)])).sent[0]!.text).toContain('já foi confirmada');
    const expenses = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.organizationId, viewer.organizationId));
    expect(expenses.map(row => row.amountCents)).toEqual([4500]);

    // The Conversation is the Organization's WhatsApp one, and keeps its name.
    const conversations = await db
      .select()
      .from(schema.conversation)
      .where(
        and(
          eq(schema.conversation.organizationId, viewer.organizationId),
          eq(schema.conversation.channel, 'WHATSAPP')
        )
      );
    expect(conversations.map(row => row.title)).toEqual(['WhatsApp']);
  });

  it('confirms the pending Proposal on "sim"', async () => {
    const { phone, viewer } = await linked();
    await deliver(
      [text(phone, 'gastei 30 na farmácia')],
      [
        {
          arguments: { amount: '30,00', date: '2026-10-22', description: 'Farmácia' },
          tool: 'propose_expense',
        },
        { text: 'Confira:' },
      ]
    );
    expect((await deliver([text(phone, 'Sim')])).sent[0]!.text).toContain('Pronto, gravei');
    const expenses = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.organizationId, viewer.organizationId));
    expect(expenses).toHaveLength(1);
  });

  it('does not let another number decide someone else’s Proposal', async () => {
    const owner = await linked();
    const { sent } = await deliver(
      [text(owner.phone, 'gastei 12 no café')],
      [
        {
          arguments: { amount: '12,00', date: '2026-10-22', description: 'Café' },
          tool: 'propose_expense',
        },
        { text: 'Confira:' },
      ]
    );
    const intruder = await linked();
    await deliver([button(intruder.phone, sent[1]!.buttons![0]!.id)]);
    const [proposal] = await db
      .select()
      .from(schema.proposal)
      .where(eq(schema.proposal.organizationId, owner.viewer.organizationId));
    expect(proposal!.status).toBe('PENDING');
  });

  it('asks for text when it gets audio or a photo', async () => {
    const { phone } = await linked();
    const { log, sent } = await deliver([
      { from: phone, id: `wamid.audio-${Math.random()}`, type: 'audio' },
    ]);
    expect(sent[0]!.text).toContain('só leio texto');
    expect(log).toHaveLength(0);
  });
});

describe('the monthly cap', () => {
  it('sends the closing notice at the cap and nothing after it', async () => {
    const { phone } = await linked();
    // Linking took one message; two more fit.
    process.env.WHATSAPP_MONTHLY_CAP = '3';
    const reply = (words: string): Completion[] => [{ text: words }];
    expect((await deliver([text(phone, 'oi')], reply('Olá!'))).sent[0]!.text).toBe('Olá!');
    expect((await deliver([text(phone, 'e aí')], reply('Tudo certo.'))).sent[0]!.text).toContain(
      'limite de mensagens'
    );
    const after = await deliver([text(phone, 'alô')], reply('...'));
    expect(after.sent).toHaveLength(0);
    // Past the cap the Model is not even asked.
    expect(after.log).toHaveLength(0);
  });

  it('splits a long answer into parts that each count', () => {
    const long = `${'a'.repeat(3000)}\n\n${'b'.repeat(3000)}`;
    const parts = splitText(long);
    expect(parts).toEqual(['a'.repeat(3000), 'b'.repeat(3000)]);
    expect(splitText('x'.repeat(5000)).map(part => part.length)).toEqual([4096, 904]);
  });
});
