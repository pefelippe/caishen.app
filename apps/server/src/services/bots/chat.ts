import type { Viewer } from '@zapbots/auth';
import { db, schema, type MessageRow } from '@zapbots/database';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { PlanLimitError, requireWithinLimit } from '../billing/billing';
import {
  aiConfigured,
  defaultModel,
  listModels,
  ModelError,
  streamCompletion,
  type ChatMessage,
} from '../models';
import { CATALOG } from './catalog';
import { botPrompt } from './prompt';
import { attachProposals, PROPOSAL_TOOLS, proposalNote, proposeFromToolCall } from './proposals';

const HISTORY = 20;

/** The app's notes on Proposals, as a Model copies them from the history into a reply. */
const NOTE = /^\s*\[?Proposta de .*:\s*(cancelada|confirmada|esperando a confirmação)\]?\s*$/i;

/** A reply without those notes. */
const withoutNotes = (reply: string) =>
  reply
    .split('\n')
    .filter(line => !NOTE.test(line))
    .join('\n')
    .trim();
/** Tool rounds in one reply before the Model must answer in text. */
const TOOL_ROUNDS = 3;
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
  try {
    await requireWithinLimit(viewer, 'messages');
  } catch (error) {
    if (error instanceof PlanLimitError) throw new ChatError(error.message);
    throw error;
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

  const history = (
    await db
      .select()
      .from(schema.message)
      .where(eq(schema.message.conversationId, conversation.id))
      .orderBy(asc(schema.message.createdAt))
  ).slice(-HISTORY);
  // What became of each Proposal, so the Model does not offer a confirmed one again.
  const proposals = history.length
    ? await db
        .select()
        .from(schema.proposal)
        .where(
          inArray(
            schema.proposal.messageId,
            history.map(message => message.id)
          )
        )
    : [];

  // Models that cannot call tools still chat; they just cannot propose records (docs/adr/0013).
  const listed = (await listModels()).find(entry => entry.id === model);
  let canPropose = listed?.supportsTools ?? true;
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
      content: await botPrompt(viewer, bot, { canPropose, mode: 'chat', screen: options.screen }),
      role: 'system',
    },
    ...history.flatMap((message): ChatMessage[] => {
      if (message.role === 'USER') return [{ content: message.content, role: 'user' }];
      const notes = proposals
        .filter(proposal => proposal.messageId === message.id)
        .map(proposalNote);
      // What became of the Proposals goes apart, as the app's note: kept inside the Bot's own
      // words, Models copy it into their next reply.
      return [
        { content: message.content, role: 'assistant' },
        ...(notes.length
          ? [{ content: `Nota do app, não repita: ${notes.join(' ')}`, role: 'system' as const }]
          : []),
      ];
    }),
    { content, role: 'user' },
  ];

  let reply = '';
  let proposed = 0;
  try {
    for (let round = 0; ; round++) {
      const tools = canPropose && round < TOOL_ROUNDS ? PROPOSAL_TOOLS : undefined;
      const ask = () =>
        streamCompletion({
          messages,
          model,
          onText: piece => {
            reply += piece;
            send({ text: piece, type: 'delta' });
          },
          signal: options.signal,
          // The last round goes without tools, so the Model ends in text.
          tools: canPropose && round < TOOL_ROUNDS ? PROPOSAL_TOOLS : undefined,
        });
      let completion: Awaited<ReturnType<typeof ask>>;
      try {
        completion = await ask();
      } catch (error) {
        // A free router may land on a Model that refuses tools: answer read-only rather than fail.
        if (!tools || reply || proposed || !(error instanceof ModelError)) throw error;
        canPropose = false;
        messages[0] = {
          content: await botPrompt(viewer, bot, { mode: 'chat', screen: options.screen }),
          role: 'system',
        };
        completion = await ask();
      }
      const { content: text, toolCalls } = completion;
      if (!toolCalls.length) break;
      messages.push({ content: text || null, role: 'assistant', tool_calls: toolCalls });
      for (const call of toolCalls) {
        const { proposal, result } = await proposeFromToolCall(viewer, conversation.id, call);
        if (proposal) proposed++;
        messages.push({ content: result, role: 'tool', tool_call_id: call.id });
      }
    }
  } catch (error) {
    // Keep what was already written visible, and any Proposal already made with it.
    if (!reply && !proposed) throw error;
    reply += `\n\n(${error instanceof ModelError ? error.message : 'A resposta foi interrompida.'})`;
  }

  const [saved] = await db
    .insert(schema.message)
    .values({
      content:
        withoutNotes(reply) ||
        (proposed ? 'Confira abaixo e confirme.' : 'Não consegui responder agora. Tente de novo.'),
      conversationId: conversation.id,
      role: 'BOT',
    })
    .returning();
  await attachProposals(conversation.id, saved!.id);
  send({ message: saved!, type: 'done' });
}
