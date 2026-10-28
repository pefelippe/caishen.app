import type { Viewer } from '@zapbots/auth';
import { db, schema, type MessageRow } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

import { reportError } from '../../sentry';
import { AttachmentError } from '../bots/attachments';
import { channelConversation, HEADINGS, latestPending, NO, YES } from '../bots/channels';
import { ChatError, replyInConversation } from '../bots/chat';
import { cancelProposal, confirmProposal, describeProposal } from '../bots/proposals';
import { ModelError } from '../models';
import { answerCallback, sendButtons, sendText } from './api';
import { redeemTelegramCode, unlinkTelegram, viewerOfChat } from './link';

/** One update as Telegram sends it; only the parts we read. */
export interface TelegramUpdate {
  callback_query?: {
    data?: string;
    id: string;
    message?: { chat: { id: number; type: string } };
  };
  message?: { chat: { id: number; type: string }; text?: string };
  update_id: number;
}

const HOW_TO_LINK =
  'Oi! Eu sou o Caishen. Para conversar comigo por aqui, abra o app, vá em Integrações e conecte o Telegram: o botão abre esta conversa já com o seu código.';
const BAD_CODE = 'Esse link não vale mais. Gere outro em Integrações, no app do Caishen.';
const LINKED =
  'Pronto, seu Telegram está conectado ao Caishen. Pode me contar um gasto ("gastei 45 no mercado hoje") ou perguntar sobre as suas finanças. Para desconectar, mande /sair.';
const UNLINKED = 'Desconectei este Telegram do Caishen. Para voltar, gere um link em Integrações.';
const ONLY_TEXT = 'Por enquanto eu só leio texto por aqui.';
const FAILED = 'Não consegui responder agora. Tente de novo em instantes.';

/**
 * Handles one update. One Telegram delivers again (same `update_id`) is dropped by the insert that
 * records it, so it is answered once. Only private chats are answered.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const [fresh] = await db
    .insert(schema.telegramUpdate)
    .values({ updateId: String(update.update_id) })
    .onConflictDoNothing()
    .returning();
  if (!fresh) return;
  try {
    if (update.callback_query) return await handleButton(update.callback_query);
    if (update.message) return await handleMessage(update.message);
  } catch (error) {
    console.error('telegram update failed:', error);
    reportError(error);
  }
}

async function handleButton(query: NonNullable<TelegramUpdate['callback_query']>) {
  await answerCallback(query.id).catch(() => null);
  const chat = query.message?.chat;
  if (!chat || chat.type !== 'private') return;
  const chatId = String(chat.id);
  const viewer = await viewerOfChat(chatId);
  if (!viewer) return sendText(chatId, HOW_TO_LINK);
  const [action, id] = (query.data ?? '').split(':');
  if ((action === 'confirm' || action === 'cancel') && id) {
    return decide(viewer, chatId, id, action);
  }
}

async function handleMessage(message: NonNullable<TelegramUpdate['message']>) {
  if (message.chat.type !== 'private') return;
  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? '';

  const start = /^\/start(?:@\w+)?(?:\s+([\w-]+))?$/.exec(text);
  if (start?.[1]) {
    return sendText(chatId, (await redeemTelegramCode(chatId, start[1])) ? LINKED : BAD_CODE);
  }
  const viewer = await viewerOfChat(chatId);
  if (!viewer) return sendText(chatId, HOW_TO_LINK);
  if (!text) return sendText(chatId, ONLY_TEXT);

  const word = text
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/[.!]+$/, '');
  if (word === 'sair') {
    await unlinkTelegram(viewer);
    return sendText(chatId, UNLINKED);
  }
  if (word === 'start') return sendText(chatId, LINKED);
  const conversationId = await channelConversation(viewer, 'TELEGRAM');
  if (YES.has(word) || NO.has(word)) {
    const pending = await latestPending(conversationId);
    if (pending) return decide(viewer, chatId, pending.id, YES.has(word) ? 'confirm' : 'cancel');
  }
  return reply(viewer, chatId, conversationId, text);
}

/** Confirms or cancels a Proposal of the Viewer's own Organization (`owned` in the service). */
async function decide(viewer: Viewer, chatId: string, id: string, action: 'cancel' | 'confirm') {
  try {
    const proposal =
      action === 'confirm' ? await confirmProposal(viewer, id) : await cancelProposal(viewer, id);
    const { title } = describeProposal(proposal);
    await sendText(
      chatId,
      action === 'confirm' ? `Pronto, gravei: ${title}.` : `Cancelado: ${title}. Nada foi gravado.`
    );
  } catch (error) {
    // Already decided, not found, or refused by the service: its message is for the User.
    if (error instanceof GraphQLError) return sendText(chatId, `${error.message}.`);
    throw error;
  }
}

/** The Caishen's answer, then each new Proposal with its buttons. */
async function reply(viewer: Viewer, chatId: string, conversationId: string, content: string) {
  const done: { message?: MessageRow } = {};
  try {
    await replyInConversation({
      content,
      conversationId,
      mode: 'telegram',
      send: event => {
        if (event.type === 'done') done.message = event.message;
      },
      viewer,
    });
  } catch (error) {
    const known =
      error instanceof AttachmentError || error instanceof ChatError || error instanceof ModelError;
    if (!known) {
      console.error('telegram reply failed:', error);
      reportError(error);
    }
    return sendText(chatId, known ? error.message : FAILED);
  }
  if (!done.message) return;
  await sendText(chatId, done.message.content);
  const proposals = await db
    .select()
    .from(schema.proposal)
    .where(
      and(eq(schema.proposal.messageId, done.message.id), eq(schema.proposal.status, 'PENDING'))
    );
  for (const proposal of proposals) {
    const { lines, title } = describeProposal(proposal);
    await sendButtons(
      chatId,
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
