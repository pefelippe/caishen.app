import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { Resolvers } from '@zapbots/graphql/server';
import { asc, desc, eq } from 'drizzle-orm';

import { CATALOG, ensureBots } from '../services/bots/catalog';
import { runJob } from '../services/bots/jobs';
import { aiConfigured, defaultModel, listModels } from '../services/models';
import { badInput, notFound, owned, requireViewer } from './guards';

const MAX_INSTRUCTIONS = 4000;
const MAX_ATTACHMENTS = 5;

/** Loads a Bot only if it belongs to the Viewer's Organization. */
async function findBot(viewer: Viewer, id: string) {
  const [row] = await db
    .select()
    .from(schema.bot)
    .where(owned(schema.bot, viewer, id));
  return row ?? notFound('Bot');
}

async function botById(id: string) {
  const [row] = await db.select().from(schema.bot).where(eq(schema.bot.id, id));
  return row!;
}

export const botResolvers: Resolvers = {
  Bot: {
    description: bot => CATALOG[bot.key].description,
    model: async bot => bot.model ?? (await defaultModel()),
    name: bot => CATALOG[bot.key].name,
    personality: bot => CATALOG[bot.key].personality,
  },
  Conversation: {
    bot: conversation => botById(conversation.botId),
    messages: conversation =>
      db
        .select()
        .from(schema.message)
        .where(eq(schema.message.conversationId, conversation.id))
        .orderBy(asc(schema.message.createdAt)),
  },
  Job: {
    attachments: job =>
      db
        .select()
        .from(schema.attachment)
        .where(eq(schema.attachment.jobId, job.id))
        .orderBy(asc(schema.attachment.createdAt)),
    bot: job => botById(job.botId),
  },
  Mutation: {
    createJob: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      const bot = await findBot(viewer, input.botId);
      const instructions = input.instructions.trim();
      if (!instructions) badInput('Diga o que precisa ser feito');
      if (instructions.length > MAX_INSTRUCTIONS) {
        badInput(`Descreva o Trabalho em até ${MAX_INSTRUCTIONS} caracteres`);
      }
      const files = input.attachments ?? [];
      if (files.length > MAX_ATTACHMENTS) badInput(`Anexe até ${MAX_ATTACHMENTS} arquivos`);
      if (!aiConfigured()) {
        badInput('Os Bots ainda não estão ligados: falta OPENROUTER_API_KEY no servidor');
      }

      const job = await db.transaction(async tx => {
        const [row] = await tx
          .insert(schema.job)
          .values({
            botId: bot.id,
            createdById: viewer.userId,
            instructions,
            organizationId: viewer.organizationId,
          })
          .returning();
        if (files.length) {
          await tx.insert(schema.attachment).values(
            files.map(file => ({
              fileId: file.fileId,
              jobId: row!.id,
              mimeType: file.mimeType,
              name: file.name,
              organizationId: viewer.organizationId,
              url: file.url,
            }))
          );
        }
        return row!;
      });
      // Runs in the background; the client polls `job` until it is DONE or FAILED.
      void runJob(viewer, job.id);
      return job;
    },
    deleteConversation: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.conversation)
        .where(owned(schema.conversation, requireViewer(context), id))
        .returning({ id: schema.conversation.id });
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
    bot: async (_, { key }, context) => {
      const bots = await ensureBots(requireViewer(context).organizationId);
      return bots.find(bot => bot.key === key) ?? notFound('Bot');
    },
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
      await findBot(viewer, botId);
      return db
        .select()
        .from(schema.conversation)
        .where(eq(schema.conversation.botId, botId))
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
  },
};
