import type { Viewer } from '@zapbots/auth';
import { db, schema, type MessageRow } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { createHash } from 'node:crypto';

import { reportError } from '../../sentry';
import { AttachmentError } from '../bots/attachments';
import { channelConversation, HEADINGS, latestPending, NO, YES } from '../bots/channels';
import { ChatError, replyInConversation } from '../bots/chat';
import { cancelProposal, confirmProposal, describeProposal } from '../bots/proposals';
import { ModelError } from '../models';
import { codesIn, redeemLinkCode, unlinkWhatsapp, viewerOfPhone } from './link';
import { capUsedUp, sendButtons, sendText } from './meta';

/** One message of a webhook delivery, as the Cloud API sends it; only the parts we read. */
export interface InboundMessage {
  from: string;
  id: string;
  interactive?: { button_reply?: { id: string; title: string }; type: string };
  text?: { body: string };
  type: string;
}

/** A webhook delivery: messages and delivery statuses, grouped by account and number. */
export interface WebhookPayload {
  entry?: { changes?: { field?: string; value?: { messages?: InboundMessage[] } }[] }[];
  object?: string;
}

const HOW_TO_LINK =
  'Oi! Eu sou o Caishen, o assistente de finanças. Para conversar comigo por aqui, abra o app, vá em Integrações e conecte o WhatsApp: ele gera um código para você me mandar.';
const BAD_CODE =
  'Esse código não vale mais. Gere outro em Integrações, no app do Caishen, e me mande em até 15 minutos.';
const LINKED =
  'Pronto, seu WhatsApp está conectado ao Caishen. Pode me contar um gasto ("gastei 45 no mercado hoje") ou perguntar sobre as suas finanças. Para desconectar, mande SAIR.';
const UNLINKED =
  'Desconectei este WhatsApp do Caishen. Para voltar, gere um código em Integrações.';
const ONLY_TEXT =
  'Por enquanto eu só leio texto por aqui. Escreva o que quer registrar ou perguntar.';
const FAILED = 'Não consegui responder agora. Tente de novo em instantes.';

/** Every message in a delivery, whatever account or number it came through. */
export const messagesOf = (payload: WebhookPayload): InboundMessage[] =>
  (payload.entry ?? []).flatMap(entry =>
    (entry.changes ?? []).flatMap(change => change.value?.messages ?? [])
  );

/**
 * Handles a delivery's messages one by one. A message Meta delivers again (same `wamid`) is
 * dropped by the insert that records it, so it is answered once (docs/adr/0019).
 */
export async function handleWebhook(payload: WebhookPayload): Promise<void> {
  for (const message of messagesOf(payload)) {
    const [fresh] = await db
      .insert(schema.whatsappMessage)
      .values({ wamid: message.id })
      .onConflictDoNothing()
      .returning();
    if (!fresh) continue;
    try {
      await handleInbound(message);
    } catch (error) {
      console.error('whatsapp message failed:', error);
      reportError(error);
    }
  }
}

async function handleInbound(message: InboundMessage): Promise<void> {
  if (await capUsedUp()) return;
  const phone = message.from;
  const text = message.text?.body.trim() ?? '';
  const viewer = await viewerOfPhone(phone);
  if (!viewer) return handleStranger(phone, text);

  const button = message.interactive?.button_reply?.id;
  if (button) {
    const [action, id] = button.split(':');
    if ((action === 'confirm' || action === 'cancel') && id) {
      return decide(viewer, phone, id, action);
    }
  }
  if (message.type !== 'text' || !text) return sendText(phone, ONLY_TEXT);

  const word = text.toLowerCase().replace(/[.!]+$/, '');
  if (word === 'sair') {
    await unlinkWhatsapp(viewer);
    return sendText(phone, UNLINKED);
  }
  const conversationId = await channelConversation(viewer, 'WHATSAPP');
  if (YES.has(word) || NO.has(word)) {
    const pending = await latestPending(conversationId);
    if (pending) return decide(viewer, phone, pending.id, YES.has(word) ? 'confirm' : 'cancel');
  }
  return reply(viewer, phone, conversationId, text);
}

/**
 * A number with no link: with a good code it links; otherwise it is told how, once. Only a hash
 * of the number is kept for that, never the number or what it wrote.
 */
async function handleStranger(phone: string, text: string): Promise<void> {
  const codes = codesIn(text);
  for (const code of codes) {
    if (await redeemLinkCode(phone, code)) return sendText(phone, LINKED);
  }
  const [first] = await db
    .insert(schema.whatsappStranger)
    .values({ phoneHash: createHash('sha256').update(phone).digest('hex') })
    .onConflictDoNothing()
    .returning();
  if (first) await sendText(phone, codes.length ? BAD_CODE : HOW_TO_LINK);
}

/** Confirms or cancels a Proposal of the Viewer's own Organization (`owned` in the service). */
async function decide(
  viewer: Viewer,
  phone: string,
  id: string,
  action: 'cancel' | 'confirm'
): Promise<void> {
  try {
    const proposal =
      action === 'confirm' ? await confirmProposal(viewer, id) : await cancelProposal(viewer, id);
    const { title } = describeProposal(proposal);
    await sendText(
      phone,
      action === 'confirm' ? `Pronto, gravei: ${title}.` : `Cancelado: ${title}. Nada foi gravado.`
    );
  } catch (error) {
    // Already decided, not found, or refused by the service: its message is for the User.
    if (error instanceof GraphQLError) return sendText(phone, `${error.message}.`);
    throw error;
  }
}

/** The Caishen's answer, as one text, then each new Proposal with its buttons. */
async function reply(
  viewer: Viewer,
  phone: string,
  conversationId: string,
  content: string
): Promise<void> {
  const done: { message?: MessageRow } = {};
  try {
    await replyInConversation({
      content,
      conversationId,
      mode: 'whatsapp',
      send: event => {
        if (event.type === 'done') done.message = event.message;
      },
      viewer,
    });
  } catch (error) {
    const known =
      error instanceof AttachmentError || error instanceof ChatError || error instanceof ModelError;
    if (!known) {
      console.error('whatsapp reply failed:', error);
      reportError(error);
    }
    return sendText(phone, known ? error.message : FAILED);
  }
  if (!done.message) return;
  await sendText(phone, done.message.content);
  const proposals = await db
    .select()
    .from(schema.proposal)
    .where(
      and(eq(schema.proposal.messageId, done.message.id), eq(schema.proposal.status, 'PENDING'))
    );
  for (const proposal of proposals) {
    const { lines, title } = describeProposal(proposal);
    await sendButtons(
      phone,
      [
        `**${HEADINGS[proposal.action]} ${title}**`,
        ...lines.map(line => `${line.label}: ${line.value}`),
      ].join('\n'),
      [
        { id: `confirm:${proposal.id}`, title: 'Confirmar' },
        { id: `cancel:${proposal.id}`, title: 'Cancelar' },
      ]
    );
  }
}
