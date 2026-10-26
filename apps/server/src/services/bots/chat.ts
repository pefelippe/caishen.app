import type { Viewer } from '@zapbots/auth';
import { db, schema, type MessageRow } from '@zapbots/database';
import { and, asc, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';

import { owned } from '../../resolvers/guards';
import { PlanLimitError, requireWithinLimit } from '../billing/billing';
import { aiConfigured, botModel, listModels, ModelError, talk, type ModelMessage } from '../models';
import { attachedNote, userContent, type ChatAttachment } from './attachments';
import { CATALOG } from './catalog';
import { botPrompt } from './prompt';
import { attachProposals, PROPOSAL_TOOLS, proposalNote, proposeFromToolCall } from './proposals';
import { isReadTool, READ_AGENT_TOOLS, runReadTool } from './tools';

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
/** Tool rounds in one reply before the Model must answer in text: reading takes a few. */
const TOOL_ROUNDS = 6;
const DEFAULT_TITLE = 'Nova conversa';
/**
 * A reply older than this is taken as dead: past the function's 300 s on Vercel, the process that
 * wrote it was stopped before it could say it ended.
 */
const REPLY_TIMEOUT_MS = 6 * 60_000;
/** How often a reply looks for Parar, which may have been pressed on another server instance. */
const STOP_POLL_MS = 1000;
const STOPPED = 'Você parou a resposta.';

/** Whether the Bot is writing a reply in this Conversation now. */
export const isReplying = (conversation: { replyingSince: Date | null }) =>
  conversation.replyingSince !== null &&
  Date.now() - conversation.replyingSince.getTime() < REPLY_TIMEOUT_MS;

/**
 * Parar: the reply being written in the Conversation ends with what it has. False when there is
 * none to stop.
 */
export async function stopReply(viewer: Viewer, conversationId: string): Promise<boolean> {
  const stopped = await db
    .update(schema.conversation)
    .set({ stopRequestedAt: new Date() })
    .where(
      and(
        owned(schema.conversation, viewer, conversationId),
        gt(schema.conversation.replyingSince, new Date(Date.now() - REPLY_TIMEOUT_MS))
      )
    )
    .returning({ id: schema.conversation.id });
  return stopped.length > 0;
}

/**
 * Marks the Conversation as being answered, unless it already is: one reply at a time, as the
 * Messages are read in order. False when another reply is still being written.
 */
async function claimReply(conversationId: string): Promise<boolean> {
  const claimed = await db
    .update(schema.conversation)
    .set({ replyingSince: new Date(), stopRequestedAt: null })
    .where(
      and(
        eq(schema.conversation.id, conversationId),
        or(
          isNull(schema.conversation.replyingSince),
          lt(schema.conversation.replyingSince, new Date(Date.now() - REPLY_TIMEOUT_MS))
        )
      )
    )
    .returning({ id: schema.conversation.id });
  return claimed.length > 0;
}

/** Aborts `controller` once Parar is pressed for the Conversation; returns how to stop looking. */
function watchForStop(conversationId: string, controller: AbortController): () => void {
  const timer = setInterval(() => {
    db.select({ stopRequestedAt: schema.conversation.stopRequestedAt })
      .from(schema.conversation)
      .where(eq(schema.conversation.id, conversationId))
      .then(([row]) => {
        if (row?.stopRequestedAt) controller.abort();
      })
      .catch(() => {});
  }, STOP_POLL_MS);
  return () => clearInterval(timer);
}

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
  /** Files sent with the Message, already checked by `readAttachments`. */
  attachments?: ChatAttachment[];
  content: string;
  conversationId: string;
  /** Where the Conversation happens: the app's chat (the default) or WhatsApp (docs/adr/0019). */
  mode?: 'chat' | 'whatsapp';
  /** Where the User is in the app, e.g. "/caishen". */
  screen?: string;
  send: (event: ChatEvent) => void;
  signal?: AbortSignal;
  viewer: Viewer;
}): Promise<void> {
  const { send, viewer } = options;
  const mode = options.mode ?? 'chat';
  const content = options.content.trim();
  const attachments = options.attachments ?? [];
  if (!content && !attachments.length) throw new ChatError('Escreva uma mensagem.');
  if (!(await aiConfigured(viewer.organizationId))) {
    throw new ChatError(
      'Os Bots ainda não estão ligados: cole a chave de um provedor de IA em Integrações.'
    );
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

  const model = await botModel(viewer.organizationId, bot.model);
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

  // Models that cannot call tools still chat; they just cannot read with tools or propose records
  // (docs/adr/0013, 0021).
  const listed = (await listModels(viewer.organizationId)).find(entry => entry.id === model);
  const canUseTools = listed?.supportsTools ?? true;
  if (listed && !listed.readsImages && attachments.some(file => file.kind === 'IMAGE')) {
    throw new ChatError(
      `O Modelo de ${CATALOG[bot.key].name} não lê imagens. Escolha um com visão em Integrações, ou mande o texto.`
    );
  }
  // In the app one reply is written at a time, and Parar can end it; WhatsApp answers each message
  // as it comes (docs/adr/0019).
  if (mode === 'chat' && !(await claimReply(conversation.id))) {
    throw new ChatError('Espere a resposta terminar, ou pare-a.');
  }
  const stopper = new AbortController();
  const stopWatching = mode === 'chat' ? watchForStop(conversation.id, stopper) : () => {};
  try {
    await answer({
      attachments,
      bot,
      canUseTools,
      content,
      conversation,
      history,
      mode,
      model,
      proposals,
      screen: options.screen,
      send,
      signal: options.signal ? AbortSignal.any([options.signal, stopper.signal]) : stopper.signal,
      stopped: stopper.signal,
      viewer,
    });
  } finally {
    stopWatching();
    if (mode === 'chat') {
      await db
        .update(schema.conversation)
        .set({ replyingSince: null, stopRequestedAt: null })
        .where(eq(schema.conversation.id, conversation.id));
    }
  }
}

/** Saves the User's Message, has the Model answer it and saves the reply. */
async function answer({
  attachments,
  bot,
  canUseTools,
  content,
  conversation,
  history,
  mode,
  model,
  proposals,
  screen,
  send,
  signal,
  stopped,
  viewer,
}: {
  attachments: ChatAttachment[];
  bot: typeof schema.bot.$inferSelect;
  canUseTools: boolean;
  content: string;
  conversation: typeof schema.conversation.$inferSelect;
  history: MessageRow[];
  mode: 'chat' | 'whatsapp';
  model: string;
  proposals: (typeof schema.proposal.$inferSelect)[];
  screen?: string;
  send: (event: ChatEvent) => void;
  signal: AbortSignal;
  /** Aborted when the User pressed Parar, not when the request went away. */
  stopped: AbortSignal;
  viewer: Viewer;
}): Promise<void> {
  await db.insert(schema.message).values({
    attachments: attachments.length ? attachments.map(({ kind, name }) => ({ kind, name })) : null,
    content,
    conversationId: conversation.id,
    role: 'USER',
  });
  await db
    .update(schema.conversation)
    .set({
      updatedAt: new Date(),
      ...(conversation.title === DEFAULT_TITLE
        ? { title: (content || attachments[0]!.name).slice(0, 60) }
        : {}),
    })
    .where(eq(schema.conversation.id, conversation.id));

  const instructions = await botPrompt(viewer, bot, {
    canPropose: canUseTools,
    canRead: canUseTools,
    mode,
    screen,
  });
  const messages: ModelMessage[] = [
    ...history.flatMap((message): ModelMessage[] => {
      if (message.role === 'USER') {
        return [{ content: message.content + attachedNote(message.attachments), role: 'user' }];
      }
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
    { content: userContent(content, attachments), role: 'user' },
  ];

  let reply = '';
  let proposed = 0;
  try {
    await talk(viewer.organizationId, model, {
      execute: async call => {
        if (isReadTool(call.name)) return runReadTool(viewer, call);
        const { proposal, result } = await proposeFromToolCall(viewer, conversation.id, call);
        if (proposal) proposed++;
        return result;
      },
      instructions,
      messages,
      onText: piece => {
        reply += piece;
        send({ text: piece, type: 'delta' });
      },
      signal,
      toolRounds: TOOL_ROUNDS,
      tools: canUseTools ? [...READ_AGENT_TOOLS, ...PROPOSAL_TOOLS] : undefined,
      // A free router may land on a Model that refuses tools: answer read-only rather than fail.
      withoutTools: () => botPrompt(viewer, bot, { mode, screen }),
    });
  } catch (error) {
    // Keep what was already written visible, and any Proposal already made with it. Parar is an
    // ending, not a failure: it is saved even before the first word.
    if (!stopped.aborted && !reply && !proposed) throw error;
    const note = stopped.aborted
      ? STOPPED
      : error instanceof ModelError
        ? error.message
        : 'A resposta foi interrompida.';
    reply = `${reply.trimEnd()}

(${note})`;
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
