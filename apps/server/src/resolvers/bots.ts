import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

import { PlanLimitError, requireWithinLimit } from '../services/billing/billing';
import { markAlerts, viewerAlerts } from '../services/bots/alerts';
import { CATALOG, ensureBots, type BotKey } from '../services/bots/catalog';
import { cancelJob, failStaleJobs, handOverJob, type JobFile } from '../services/bots/jobs';
import {
  cancelProposal,
  confirmProposal,
  describeProposal,
  editProposal,
  proposalFields,
} from '../services/bots/proposals';
import { MAX_ROUTINES, nextRunAfter } from '../services/bots/routines';
import { aiConfigured, defaultModel, listModels } from '../services/models';
import { badInput, notFound, owned, requireViewer } from './guards';

const MAX_INSTRUCTIONS = 4000;
const MAX_ATTACHMENTS = 5;
const MAX_DELIVERABLE = 100_000;
const MAX_RECENT_JOBS = 20;
/** Jobs in the queue or running at once per Organization, to keep cost and the server in check. */
const MAX_WORKING_JOBS = 3;

/** Loads a Bot only if it belongs to the Viewer's Organization. */
async function findBot(viewer: Viewer, id: string) {
  const [row] = await db
    .select()
    .from(schema.bot)
    .where(owned(schema.bot, viewer, id));
  return row ?? notFound('Bot');
}

function requireAi() {
  if (!aiConfigured()) {
    badInput('Os Bots ainda não estão ligados: falta OPENROUTER_API_KEY no servidor');
  }
}

/** The instructions of a Job or Routine, trimmed; refuses empty or overlong ones. */
function validInstructions(raw: string): string {
  const instructions = raw.trim();
  if (!instructions) badInput('Diga o que precisa ser feito');
  if (instructions.length > MAX_INSTRUCTIONS) {
    badInput(`Descreva o Workflow em até ${MAX_INSTRUCTIONS} caracteres`);
  }
  return instructions;
}

/** Refuses new work while the Organization already has the most Jobs in progress. */
async function requireRoom(viewer: Viewer) {
  // On Vercel a Job that outlived its function would hold a place forever.
  if (process.env.VERCEL) await failStaleJobs();
  const working = await db
    .select({ id: schema.job.id })
    .from(schema.job)
    .where(and(owned(schema.job, viewer), inArray(schema.job.status, ['QUEUED', 'RUNNING'])));
  if (working.length >= MAX_WORKING_JOBS) {
    badInput(
      `Já há ${MAX_WORKING_JOBS} Workflows em andamento. Espere um terminar para pedir outro.`
    );
  }
}

/** Refuses a Job past the month's Limit of the Organization's Plan (docs/adr/0011). */
async function requireAllowance(viewer: Viewer) {
  try {
    await requireWithinLimit(viewer, 'jobs');
  } catch (error) {
    if (error instanceof PlanLimitError) {
      throw new GraphQLError(error.message, { extensions: { code: 'PLAN_LIMIT' } });
    }
    throw error;
  }
}

/** Saves a Job and starts it; refused while the server has no Model provider. */
async function handOver(viewer: Viewer, botId: string, instructions: string, files: JobFile[]) {
  requireAi();
  await requireRoom(viewer);
  await requireAllowance(viewer);
  return handOverJob(viewer, { botId, files, instructions });
}

async function botById(id: string) {
  const [row] = await db.select().from(schema.bot).where(eq(schema.bot.id, id));
  return row!;
}

/** The Viewer's Organization's Bot with this key. */
async function viewerBot(viewer: Viewer, key: BotKey) {
  const bots = await ensureBots(viewer.organizationId);
  return bots.find(bot => bot.key === key) ?? notFound('Bot');
}

export const botResolvers: Resolvers = {
  Bot: {
    alerts: async (bot, _, context) =>
      (await viewerAlerts(requireViewer(context), bot.key)).map(alert => ({
        ...alert,
        id: alert.key,
      })),
    description: bot => CATALOG[bot.key].description,
    model: async bot => bot.model ?? (await defaultModel()),
    name: bot => CATALOG[bot.key].name,
    personality: bot => CATALOG[bot.key].personality,
    // The Bot was loaded through the Viewer's Organization, so its Jobs are theirs too.
    recentJobs: (bot, { limit }) =>
      db
        .select()
        .from(schema.job)
        .where(eq(schema.job.botId, bot.id))
        .orderBy(desc(schema.job.createdAt))
        .limit(Math.min(Math.max(limit ?? 3, 0), MAX_RECENT_JOBS)),
  },
  Conversation: {
    bot: conversation => botById(conversation.botId),
    lastMessage: async conversation => {
      const [row] = await db
        .select()
        .from(schema.message)
        .where(eq(schema.message.conversationId, conversation.id))
        .orderBy(desc(schema.message.createdAt))
        .limit(1);
      return row ?? null;
    },
    messages: conversation =>
      db
        .select()
        .from(schema.message)
        .where(eq(schema.message.conversationId, conversation.id))
        .orderBy(asc(schema.message.createdAt)),
  },
  Message: {
    attachments: message => message.attachments ?? [],
    proposals: message =>
      db
        .select()
        .from(schema.proposal)
        .where(eq(schema.proposal.messageId, message.id))
        .orderBy(asc(schema.proposal.createdAt)),
  },
  Proposal: {
    fields: proposal => proposalFields(proposal),
    lines: proposal => describeProposal(proposal).lines,
    title: proposal => describeProposal(proposal).title,
  },
  Routine: {
    paused: routine => routine.pausedAt !== null,
  },
  Job: {
    attachments: job =>
      db
        .select()
        .from(schema.attachment)
        .where(eq(schema.attachment.jobId, job.id))
        .orderBy(asc(schema.attachment.createdAt)),
    bot: job => botById(job.botId),
    deliverable: job => job.editedDeliverable ?? job.deliverable,
    edited: job => job.editedDeliverable !== null,
    originalDeliverable: job => job.deliverable,
    routine: async job => {
      if (!job.routineId) return null;
      const [row] = await db
        .select()
        .from(schema.routine)
        .where(eq(schema.routine.id, job.routineId));
      return row ?? null;
    },
  },
  Mutation: {
    createJob: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      const bot = await findBot(viewer, input.botId);
      const instructions = validInstructions(input.instructions);
      const files = input.attachments ?? [];
      if (files.length > MAX_ATTACHMENTS) badInput(`Anexe até ${MAX_ATTACHMENTS} arquivos`);
      return handOver(viewer, bot.id, instructions, files);
    },
    createRoutine: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      const bot = await findBot(viewer, input.botId);
      const instructions = validInstructions(input.instructions);
      requireAi();
      await requireRoom(viewer);
      const existing = await db
        .select({ id: schema.routine.id })
        .from(schema.routine)
        .where(owned(schema.routine, viewer));
      if (existing.length >= MAX_ROUTINES) badInput(`Mantenha até ${MAX_ROUTINES} Rotinas`);
      await requireAllowance(viewer);
      const now = new Date();
      const [routine] = await db
        .insert(schema.routine)
        .values({
          botId: bot.id,
          cadence: input.cadence,
          createdById: viewer.userId,
          instructions,
          nextRunAt: nextRunAfter(input.cadence, now),
          organizationId: viewer.organizationId,
        })
        .returning();
      // The first run is now, so the User sees the Deliverable without waiting a week or a month.
      await handOverJob(viewer, { botId: bot.id, files: [], instructions, routineId: routine!.id });
      return routine!;
    },
    confirmProposal: (_, { id }, context) => confirmProposal(requireViewer(context), id),
    cancelProposal: (_, { id }, context) => cancelProposal(requireViewer(context), id),
    dismissAlert: async (_, { bot, id }, context) => {
      const viewer = requireViewer(context);
      await markAlerts(viewer, bot, [id], 'DISMISSED');
      return viewerBot(viewer, bot);
    },
    markAlertsRead: async (_, { bot, ids }, context) => {
      const viewer = requireViewer(context);
      await markAlerts(viewer, bot, ids, 'READ');
      return viewerBot(viewer, bot);
    },
    editProposal: (_, { id, values }, context) => editProposal(requireViewer(context), id, values),
    deleteConversation: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.conversation)
        .where(owned(schema.conversation, requireViewer(context), id))
        .returning({ id: schema.conversation.id });
      return deleted.length > 0;
    },
    cancelJob: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [job] = await db
        .select()
        .from(schema.job)
        .where(owned(schema.job, viewer, id));
      if (!job) notFound('Workflow');
      if (!(await cancelJob(job.id))) badInput('Este Workflow já terminou');
      const [row] = await db.select().from(schema.job).where(eq(schema.job.id, job.id));
      return row!;
    },
    editDeliverable: async (_, { id, text }, context) => {
      const viewer = requireViewer(context);
      const [job] = await db
        .select()
        .from(schema.job)
        .where(owned(schema.job, viewer, id));
      if (!job) notFound('Workflow');
      if (job.status !== 'DONE') badInput('Só a Entrega de um Workflow pronto pode ser editada');
      if (text != null && text.length > MAX_DELIVERABLE) {
        badInput(`A Entrega cabe em até ${MAX_DELIVERABLE} caracteres`);
      }
      // Saving the Bot's own text again is the same as restoring it.
      const edited = text == null || text === job.deliverable ? null : text;
      const [row] = await db
        .update(schema.job)
        .set({ editedDeliverable: edited })
        .where(owned(schema.job, viewer, id))
        .returning();
      return row!;
    },
    retryJob: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [failed] = await db
        .select()
        .from(schema.job)
        .where(owned(schema.job, viewer, id));
      if (!failed) notFound('Workflow');
      if (failed.status !== 'FAILED') badInput('Só um Workflow que falhou pode ser pedido de novo');
      const files = await db
        .select()
        .from(schema.attachment)
        .where(eq(schema.attachment.jobId, failed.id))
        .orderBy(asc(schema.attachment.createdAt));
      return handOver(viewer, failed.botId, failed.instructions, files);
    },
    setRoutinePaused: async (_, { id, paused }, context) => {
      const [row] = await db
        .update(schema.routine)
        .set({ pausedAt: paused ? new Date() : null })
        .where(owned(schema.routine, requireViewer(context), id))
        .returning();
      return row ?? notFound('Rotina');
    },
    deleteRoutine: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.routine)
        .where(owned(schema.routine, requireViewer(context), id))
        .returning({ id: schema.routine.id });
      return deleted.length > 0;
    },
    deleteJob: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.job)
        .where(owned(schema.job, requireViewer(context), id))
        .returning({ id: schema.job.id });
      return deleted.length > 0;
    },
    setBotModel: async (_, { id, model }, context) => {
      const viewer = requireViewer(context);
      await findBot(viewer, id);
      if (model) {
        const models = await listModels();
        if (models.length && !models.some(candidate => candidate.id === model)) {
          badInput('Modelo desconhecido');
        }
      }
      const [row] = await db
        .update(schema.bot)
        .set({ model: model ?? null })
        .where(eq(schema.bot.id, id))
        .returning();
      return row!;
    },
    startConversation: async (_, { botId }, context) => {
      const viewer = requireViewer(context);
      await findBot(viewer, botId);
      const [row] = await db
        .insert(schema.conversation)
        .values({ botId, organizationId: viewer.organizationId })
        .returning();
      return row!;
    },
  },
  Query: {
    aiStatus: async () => ({ configured: aiConfigured(), defaultModel: await defaultModel() }),
    bot: (_, { key }, context) => viewerBot(requireViewer(context), key),
    bots: (_, __, context) => ensureBots(requireViewer(context).organizationId),
    conversation: async (_, { id }, context) => {
      const [row] = await db
        .select()
        .from(schema.conversation)
        .where(owned(schema.conversation, requireViewer(context), id));
      return row ?? null;
    },
    conversations: async (_, { botId }, context) => {
      const viewer = requireViewer(context);
      if (botId) await findBot(viewer, botId);
      return db
        .select()
        .from(schema.conversation)
        .where(botId ? eq(schema.conversation.botId, botId) : owned(schema.conversation, viewer))
        .orderBy(desc(schema.conversation.updatedAt))
        .limit(50);
    },
    job: async (_, { id }, context) => {
      const [row] = await db
        .select()
        .from(schema.job)
        .where(owned(schema.job, requireViewer(context), id));
      return row ?? null;
    },
    jobs: async (_, { botId }, context) => {
      const viewer = requireViewer(context);
      await findBot(viewer, botId);
      return db
        .select()
        .from(schema.job)
        .where(eq(schema.job.botId, botId))
        .orderBy(desc(schema.job.createdAt))
        .limit(50);
    },
    models: () => listModels(),
    routines: async (_, { botId }, context) => {
      const viewer = requireViewer(context);
      await findBot(viewer, botId);
      return db
        .select()
        .from(schema.routine)
        .where(eq(schema.routine.botId, botId))
        .orderBy(asc(schema.routine.createdAt));
    },
  },
};
