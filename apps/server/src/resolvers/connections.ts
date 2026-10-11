import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { and, eq } from 'drizzle-orm';

import { driveConnected, googleConfigured } from '../services/drive';
import { badInput, notFound, requireViewer } from './guards';
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
          .where(
            and(
              eq(schema.note.id, input.noteId),
              eq(schema.note.organizationId, viewer.organizationId)
            )
          );
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
        .where(
          and(
            eq(schema.attachment.id, id),
            eq(schema.attachment.organizationId, viewer.organizationId)
          )
        )
        .returning({ id: schema.attachment.id });
      return deleted.length > 0;
    },
  },
  Query: {
    connections: async (_, __, context) => {
      const viewer = requireViewer(context);
      const [google] = await db
        .select({ id: schema.account.id })
        .from(schema.account)
        .where(
          and(eq(schema.account.userId, viewer.userId), eq(schema.account.providerId, 'google'))
        );
      const unavailableReason = !googleConfigured()
        ? 'O servidor está sem as credenciais do Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).'
        : !google
          ? 'Entre com sua conta Google para conectar o Drive. O usuário de demonstração não tem uma.'
          : null;
      return [
        {
          available: true,
          connected: !unavailableReason && (await driveConnected(viewer.userId)),
          kind: 'GOOGLE_DRIVE' as const,
          unavailableReason,
        },
        {
          available: false,
          connected: false,
          kind: 'SPOTIFY' as const,
          unavailableReason: 'Em breve.',
        },
      ];
    },
  },
};
