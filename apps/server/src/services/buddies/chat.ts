import type { Viewer } from '@mny/auth';
import { db, schema, type MessageRow } from '@mny/database';
import { today } from '@mny/finance';
import { and, asc, eq } from 'drizzle-orm';

import {
  aiConfigured,
  defaultModel,
  ModelError,
  streamCompletion,
  supportsTools,
  type ChatMessage,
} from '../models';
import { buddyContext } from './context';
import { runTool, toolsFor, type BuddyAction } from './tools';

const HISTORY = 20;
/** Rounds of tool use before the Buddy must answer in text. */
const MAX_ROUNDS = 4;
const DEFAULT_TITLE = 'Nova conversa';

const AREA_LABEL = {
  FINANCE: 'Finanças',
  FITNESS: 'Fitness',
  GENERAL: 'todas as Áreas',
  NOTES: 'Anotações',
  WORK: 'Trabalho',
} as const;

export type ChatEvent =
  | { text: string; type: 'delta' }
  | { action: BuddyAction; type: 'action' }
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
  /** Where the User is in the app, e.g. "/trabalho". */
  screen?: string;
  send: (event: ChatEvent) => void;
  signal?: AbortSignal;
  viewer: Viewer;
}): Promise<void> {
  const { send, viewer } = options;
  const content = options.content.trim();
  if (!content) throw new ChatError('Escreva uma mensagem.');
  if (!aiConfigured()) {
    throw new ChatError(
      'Os Buddies ainda não estão ligados: falta OPENROUTER_API_KEY no servidor.'
    );
  }

  const [row] = await db
    .select({ buddy: schema.buddy, conversation: schema.conversation })
    .from(schema.conversation)
    .innerJoin(schema.buddy, eq(schema.buddy.id, schema.conversation.buddyId))
    .where(
      and(
        eq(schema.conversation.id, options.conversationId),
        eq(schema.conversation.organizationId, viewer.organizationId)
      )
    );
  if (!row) throw new ChatError('Conversa não encontrada.');
  const { buddy, conversation } = row;

  const model = buddy.model ?? (await defaultModel());
  if (!model) throw new ChatError('Nenhum Modelo disponível. Escolha um na página de Buddies.');
  const canAct = await supportsTools(model);

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

  const system = [
    `Você é ${buddy.name}, o Buddy de ${AREA_LABEL[buddy.area]} do mny, um organizador pessoal.`,
    `Sua personalidade: ${buddy.personality}`,
    'Responda em português do Brasil, de forma curta e direta, em texto simples sem markdown.',
    'Use apenas os dados abaixo. Se a resposta não estiver neles, diga que não sabe.',
    'Os valores em reais já estão calculados: cite-os como estão e não faça contas com dinheiro.',
    canAct
      ? 'Use uma ferramenta só quando a pessoa pedir para criar ou registrar algo, e depois diga o que fez. Você não pode alterar Obrigações, Faturas, renda ou qualquer valor.'
      : 'Você não pode executar ações com este Modelo: só converse e leia os dados. Se pedirem para criar algo, explique que é preciso trocar o Modelo na página de Buddies.',
    `Hoje é ${today()}.`,
    options.screen ? `A pessoa está na tela ${options.screen}.` : '',
    '',
    await buddyContext(viewer, buddy.area),
  ]
    .filter(line => line !== '')
    .join('\n');

  const messages: ChatMessage[] = [
    { content: system, role: 'system' },
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

  const actions: BuddyAction[] = [];
  let reply = '';
  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const lastRound = round === MAX_ROUNDS - 1;
      const result = await streamCompletion({
        messages,
        model,
        onText: text => {
          reply += text;
          send({ text, type: 'delta' });
        },
        signal: options.signal,
        tools: canAct && !lastRound ? toolsFor(buddy.area) : undefined,
      });
      if (!result.toolCalls.length) break;

      messages.push({
        content: result.content || null,
        role: 'assistant',
        tool_calls: result.toolCalls,
      });
      for (const call of result.toolCalls) {
        const outcome = await runTool(
          viewer,
          buddy.area,
          call.function.name,
          call.function.arguments
        );
        if (outcome.action) {
          actions.push(outcome.action);
          send({ action: outcome.action, type: 'action' });
        }
        messages.push({ content: outcome.result, role: 'tool', tool_call_id: call.id });
      }
    }
  } catch (error) {
    // Keep what was already done visible: Actions ran even if the Model then failed.
    if (!actions.length && !reply) throw error;
    reply += `\n\n(${error instanceof ModelError ? error.message : 'A resposta foi interrompida.'})`;
  }

  const [saved] = await db
    .insert(schema.message)
    .values({
      actions,
      content:
        reply.trim() ||
        (actions.length ? 'Feito.' : 'Não consegui responder agora. Tente de novo.'),
      conversationId: conversation.id,
      role: 'BUDDY',
    })
    .returning();
  send({ message: saved!, type: 'done' });
}
