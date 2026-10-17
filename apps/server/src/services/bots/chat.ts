import type { Viewer } from '@zapbots/auth';
import { db, schema, type MessageRow } from '@zapbots/database';
import { and, asc, eq } from 'drizzle-orm';

import {
  aiConfigured,
  defaultModel,
  ModelError,
  streamCompletion,
  type ChatMessage,
} from '../models';
import { CATALOG } from './catalog';
import { botPrompt } from './prompt';

const HISTORY = 20;
const DEFAULT_TITLE = 'Nova conversa';

export type ChatEvent =
  | { text: string; type: 'delta' }
  | { message: MessageRow; type: 'done' }
  | { message: string; type: 'error' };

/** A failure the User should read as-is (pt-BR). */
export class ChatError extends Error {}

/**
 * Answers one Message of the User inside a Conversation, streaming the reply through `send`.
 * Both Messages are saved; a failed reply leaves the User's Message in place.
 */
export async function replyInConversation(options: {
  content: string;
  conversationId: string;
  /** Where the User is in the app, e.g. "/caishen". */
  screen?: string;
  send: (event: ChatEvent) => void;
  signal?: AbortSignal;
  viewer: Viewer;
}): Promise<void> {
  const { send, viewer } = options;
  const content = options.content.trim();
  if (!content) throw new ChatError('Escreva uma mensagem.');
  if (!aiConfigured()) {
    throw new ChatError('Os Bots ainda não estão ligados: falta OPENROUTER_API_KEY no servidor.');
  }

  const [row] = await db
    .select({ bot: schema.bot, conversation: schema.conversation })
    .from(schema.conversation)
    .innerJoin(schema.bot, eq(schema.bot.id, schema.conversation.botId))
    .where(
      and(
        eq(schema.conversation.id, options.conversationId),
        eq(schema.conversation.organizationId, viewer.organizationId)
      )
    );
  if (!row) throw new ChatError('Conversa não encontrada.');
  const { bot, conversation } = row;

  const model = bot.model ?? (await defaultModel());
  if (!model) {
    throw new ChatError(`Nenhum Modelo disponível. Escolha um para ${CATALOG[bot.key].name}.`);
  }

  const history = await db
    .select()
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversation.id))
    .orderBy(asc(schema.message.createdAt));
  await db
    .insert(schema.message)
    .values({ content, conversationId: conversation.id, role: 'USER' });
  await db
    .update(schema.conversation)
    .set({
      updatedAt: new Date(),
      ...(conversation.title === DEFAULT_TITLE ? { title: content.slice(0, 60) } : {}),
    })
    .where(eq(schema.conversation.id, conversation.id));

  const messages: ChatMessage[] = [
    {
      content: await botPrompt(viewer, bot, { mode: 'chat', screen: options.screen }),
      role: 'system',
    },
    ...history
      .slice(-HISTORY)
      .map(
        (message): ChatMessage =>
          message.role === 'USER'
            ? { content: message.content, role: 'user' }
            : { content: message.content, role: 'assistant' }
      ),
    { content, role: 'user' },
  ];

  let reply = '';
  try {
    await streamCompletion({
      messages,
      model,
      onText: text => {
        reply += text;
        send({ text, type: 'delta' });
      },
      signal: options.signal,
    });
  } catch (error) {
    // Keep what was already written visible.
    if (!reply) throw error;
    reply += `\n\n(${error instanceof ModelError ? error.message : 'A resposta foi interrompida.'})`;
  }

  const [saved] = await db
    .insert(schema.message)
    .values({
      content: reply.trim() || 'Não consegui responder agora. Tente de novo.',
      conversationId: conversation.id,
      role: 'BOT',
    })
    .returning();
  send({ message: saved!, type: 'done' });
}
