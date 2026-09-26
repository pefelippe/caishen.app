import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { findHolder, notFound, requireViewer } from './guards';

const noteColumns = {
  createdAt: schema.note.createdAt,
  createdById: schema.note.createdById,
  creditCardId: schema.note.creditCardId,
  creditOperationId: schema.note.creditOperationId,
  holderId: schema.note.holderId,
  id: schema.note.id,
  organizationId: schema.note.organizationId,
  title: schema.note.title,
  updatedAt: schema.note.updatedAt,
};

/** Notes without their Yjs `content`, which only the collab app reads. */
const selectNotes = () => db.select(noteColumns).from(schema.note);

const inOrganization = (organizationId: string, id?: string) =>
  and(eq(schema.note.organizationId, organizationId), id ? eq(schema.note.id, id) : undefined);

export const noteResolvers: Resolvers = {
  Mutation: {
    createNote: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      if (input.holderId) await findHolder(viewer, input.holderId);
      const [row] = await db
        .insert(schema.note)
        .values({
          createdById: viewer.userId,
          creditCardId: input.creditCardId ?? null,
          creditOperationId: input.creditOperationId ?? null,
          holderId: input.holderId ?? null,
          organizationId: viewer.organizationId,
          ...(input.title ? { title: input.title } : {}),
        })
        .returning(noteColumns);
      return { ...row!, content: null };
    },
    deleteNote: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const deleted = await db
        .delete(schema.note)
        .where(inOrganization(viewer.organizationId, id))
        .returning({ id: schema.note.id });
      return deleted.length > 0;
    },
    renameNote: async (_, { id, title }, context) => {
      const viewer = requireViewer(context);
      const [row] = await db
        .update(schema.note)
        .set({ title })
        .where(inOrganization(viewer.organizationId, id))
        .returning(noteColumns);
      return row ? { ...row, content: null } : notFound('Anotação');
    },
  },
  Note: {
    creditCard: async note => {
      if (!note.creditCardId) return null;
      const [row] = await db
        .select()
        .from(schema.creditCard)
        .where(eq(schema.creditCard.id, note.creditCardId));
      return row ?? null;
    },
    creditOperation: async note => {
      if (!note.creditOperationId) return null;
      const [row] = await db
        .select()
        .from(schema.creditOperation)
        .where(eq(schema.creditOperation.id, note.creditOperationId));
      return row ?? null;
    },
    holder: async note => {
      if (!note.holderId) return null;
      const [row] = await db
        .select()
        .from(schema.holder)
        .where(eq(schema.holder.id, note.holderId));
      return row ?? null;
    },
  },
  Query: {
    note: async (_, { id }, context) => {
      const [row] = await selectNotes().where(
        inOrganization(requireViewer(context).organizationId, id)
      );
      return row ? { ...row, content: null } : null;
    },
    notes: async (_, __, context) => {
      const rows = await selectNotes()
        .where(inOrganization(requireViewer(context).organizationId))
        .orderBy(desc(schema.note.updatedAt));
      return rows.map(row => ({ ...row, content: null }));
    },
  },
};
