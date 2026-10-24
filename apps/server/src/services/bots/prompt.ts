import type { Viewer } from '@zapbots/auth';
import { db, schema, type BotRow } from '@zapbots/database';
import { caishenInstructions, dateOf, today, type CaishenPromptInput } from '@zapbots/finance';
import { and, desc, eq } from 'drizzle-orm';

import { owned } from '../../resolvers/guards';

import { botAlerts } from './alerts';
import { botContext } from './context';
import { editableRecords } from './proposals';

const RECENT_DELIVERABLES = 3;
const DELIVERABLE_CHARS = 800;
const OPEN_DOCUMENT_CHARS = 8000;
const DOCUMENT_PATH = /^\/documents\/([0-9a-f-]{36})$/i;

/**
 * The Bot's latest Deliverables, so a Conversation can pick up where a Job left off. They were
 * written by a Model, so the prompt says the data above wins over any number in them.
 */
async function recentDeliverables(bot: BotRow): Promise<string> {
  const jobs = await db
    .select()
    .from(schema.job)
    .where(and(eq(schema.job.botId, bot.id), eq(schema.job.status, 'DONE')))
    .orderBy(desc(schema.job.finishedAt))
    .limit(RECENT_DELIVERABLES);
  if (!jobs.length) return '';
  const blocks = jobs.map(job => {
    const text = job.editedDeliverable ?? job.deliverable ?? '';
    const body =
      text.length > DELIVERABLE_CHARS ? `${text.slice(0, DELIVERABLE_CHARS)}… (cortado)` : text;
    const day = dateOf(job.finishedAt ?? job.createdAt)
      .split('-')
      .reverse()
      .join('/');
    return `### ${day}: ${job.instructions}\n${body}`;
  });
  return [
    '## Entregas anteriores',
    'Escritas por você em Workflows já concluídos. Se algum número delas divergir dos dados acima, valem os dados acima.',
    ...blocks,
  ].join('\n');
}

/**
 * The Deliverable open on screen beside the chat, as the User left it, so "explain step 2" works
 * without pasting anything. Only one of the Viewer's own finished Jobs, found by the page's path.
 */
async function openDocument(viewer: Viewer, screen: string | undefined): Promise<string> {
  const id = screen?.match(DOCUMENT_PATH)?.[1];
  if (!id) return '';
  const [job] = await db
    .select()
    .from(schema.job)
    .where(and(owned(schema.job, viewer, id), eq(schema.job.status, 'DONE')));
  const text = job?.editedDeliverable ?? job?.deliverable;
  if (!job || !text) return '';
  const body =
    text.length > OPEN_DOCUMENT_CHARS ? `${text.slice(0, OPEN_DOCUMENT_CHARS)}… (cortado)` : text;
  return [
    '## Documento aberto',
    `A pessoa está lendo esta Entrega, do Workflow "${job.instructions}". Perguntas sobre "o documento" ou "este plano" falam dela.`,
    body,
  ].join('\n');
}

/** The Bot's Alerts, so it brings up what is urgent before anything else. */
async function alertSection(viewer: Viewer, bot: BotRow): Promise<string> {
  const alerts = await botAlerts(viewer, bot.key);
  if (!alerts.length) return '';
  return [
    '## Avisos',
    'O que merece atenção agora, do mais urgente ao menos. Mencione quando for relevante para o pedido.',
    ...alerts.map(alert => `- ${alert.message}`),
  ].join('\n');
}

/**
 * The system prompt of a Bot: its fixed instructions (in its package) and the Viewer's data. Bots
 * never move money; in a chat they may propose records the User then confirms (docs/adr/0013), and
 * read and simulate through tools (docs/adr/0021).
 */
export async function botPrompt(
  viewer: Viewer,
  bot: BotRow,
  options: {
    canPropose?: boolean;
    canRead?: boolean;
    mode: CaishenPromptInput['mode'];
    screen?: string;
  }
): Promise<string> {
  const data = [
    await botContext(viewer, bot.key),
    await alertSection(viewer, bot),
    await recentDeliverables(bot),
    await openDocument(viewer, options.screen),
    options.canPropose ? await editableRecords(viewer) : '',
  ];
  switch (bot.key) {
    case 'FINANCE':
      return caishenInstructions({
        canPropose: Boolean(options.canPropose),
        canRead: Boolean(options.canRead),
        data,
        mode: options.mode,
        screen: options.screen,
        today: today(),
      });
  }
}
