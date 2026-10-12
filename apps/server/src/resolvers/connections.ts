import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';

import { connections } from '../services/connections';
import { badInput, notFound, owned, requireViewer } from './guards';
import { findTask } from './work';

export const connectionResolvers: Resolvers = {
  Mutation: {
    addAttachment: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      if (Boolean(input.noteId) === Boolean(input.taskId)) {
        badInput('Um Anexo pertence a uma Anotação ou a uma Tarefa');
      }
      if (input.taskId) await findTask(viewer, input.taskId);
      if (input.noteId) {
        const [note] = await db
          .select({ id: schema.note.id })
          .from(schema.note)
          .where(owned(schema.note, viewer, input.noteId));
        if (!note) notFound('Anotação');
      }
      const [row] = await db
        .insert(schema.attachment)
        .values({
          fileId: input.fileId,
          mimeType: input.mimeType,
          name: input.name,
          noteId: input.noteId ?? null,
          organizationId: viewer.organizationId,
          taskId: input.taskId ?? null,
          url: input.url,
        })
        .returning();
      return row!;
    },
    removeAttachment: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const deleted = await db
        .delete(schema.attachment)
        .where(owned(schema.attachment, viewer, id))
        .returning({ id: schema.attachment.id });
      return deleted.length > 0;
    },
  },
  Query: {
    connections: (_, __, context) => connections(requireViewer(context)),
  },
};
