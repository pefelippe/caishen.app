import type { Viewer } from '@mny/auth';
import { db, schema } from '@mny/database';
import type { Context } from '@mny/graphql/server';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export function requireViewer(context: Context): Viewer {
  if (!context.viewer) {
    throw new GraphQLError('Faça login e selecione uma Organização', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.viewer;
}

export function notFound(what: string): never {
  throw new GraphQLError(`${what} não encontrado(a)`, { extensions: { code: 'NOT_FOUND' } });
}

export function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** Loads a Holder only if it belongs to the Viewer's Organization. */
export async function findHolder(viewer: Viewer, id: string) {
  const [holder] = await db
    .select()
    .from(schema.holder)
    .where(and(eq(schema.holder.id, id), eq(schema.holder.organizationId, viewer.organizationId)));
  return holder ?? notFound('Titular');
}
