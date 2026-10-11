import type { Viewer } from '@mny/auth';
import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { asc, desc, eq } from 'drizzle-orm';

import { ensureBuddies } from '../services/buddies/defaults';
import { aiConfigured, defaultModel, listModels, supportsTools } from '../services/models';
import { badInput, notFound, owned, requireViewer } from './guards';

/** Loads a Buddy only if it belongs to the Viewer's Organization. */
async function findBuddy(viewer: Viewer, id: string) {
  const [row] = await db
    .select()
    .from(schema.buddy)
    .where(owned(schema.buddy, viewer, id));
  return row ?? notFound('Buddy');
}

const conversationOf = (viewer: Viewer, id: string) => owned(schema.conversation, viewer, id);

export const buddyResolvers: Resolvers = {
  Buddy: {
    canAct: async buddy => supportsTools(buddy.model ?? (await defaultModel())),
    model: async buddy => buddy.model ?? (await defaultModel()),
  },
  Conversation: {
    buddy: async conversation => {
      const [row] = await db
        .select()
        .from(schema.buddy)
        .where(eq(schema.buddy.id, conversation.buddyId));
      return row!;
    },
    messages: conversation =>
      db
        .select()
        .from(schema.message)
        .where(eq(schema.message.conversationId, conversation.id))
        .orderBy(asc(schema.message.createdAt)),
  },
  Message: {
    actions: message => message.actions as never,
  },
  Mutation: {
    deleteConversation: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.conversation)
        .where(conversationOf(requireViewer(context), id))
        .returning({ id: schema.conversation.id });
      return deleted.length > 0;
    },
    startConversation: async (_, { buddyId }, context) => {
      const viewer = requireViewer(context);
      await findBuddy(viewer, buddyId);
      const [row] = await db
        .insert(schema.conversation)
        .values({ buddyId, organizationId: viewer.organizationId })
        .returning();
      return row!;
    },
    updateBuddy: async (_, { id, input }, context) => {
      const viewer = requireViewer(context);
      await findBuddy(viewer, id);
      if (input.name != null && !input.name.trim()) badInput('Dê um nome ao Buddy');
      if (input.personality != null && !input.personality.trim()) {
        badInput('Descreva a personalidade do Buddy');
      }
      if (input.model) {
        const models = await listModels();
        if (models.length && !models.some(model => model.id === input.model)) {
          badInput('Modelo desconhecido');
        }
      }
      const [row] = await db
        .update(schema.buddy)
        .set({
          // `undefined` leaves the column alone; a null model goes back to the default.
          model: input.model,
          name: input.name?.trim(),
          personality: input.personality?.trim(),
        })
        .where(eq(schema.buddy.id, id))
        .returning();
      return row!;
    },
  },
  Query: {
    aiStatus: async () => ({ configured: aiConfigured(), defaultModel: await defaultModel() }),
    buddies: (_, __, context) => ensureBuddies(requireViewer(context).organizationId),
    buddy: async (_, { area }, context) => {
      const buddies = await ensureBuddies(requireViewer(context).organizationId);
      return buddies.find(buddy => buddy.area === area) ?? notFound('Buddy');
    },
    conversation: async (_, { id }, context) => {
      const [row] = await db
        .select()
        .from(schema.conversation)
        .where(conversationOf(requireViewer(context), id));
      return row ?? null;
    },
    conversations: async (_, { buddyId }, context) => {
      const viewer = requireViewer(context);
      await findBuddy(viewer, buddyId);
      return db
        .select()
        .from(schema.conversation)
        .where(eq(schema.conversation.buddyId, buddyId))
        .orderBy(desc(schema.conversation.updatedAt))
        .limit(50);
    },
    models: () => listModels(),
  },
};
