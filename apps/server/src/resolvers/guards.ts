import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { Context } from '@zapbots/graphql/server';
import { and, eq } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
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

/**
 * The one place the Organization boundary is written: a `where` clause for the rows of `table`
 * that belong to the Viewer's Organization, narrowed to `id` when given.
 */
export function owned(
  table: { id: AnyPgColumn; organizationId: AnyPgColumn },
  viewer: Viewer,
  id?: string
) {
  return and(
    eq(table.organizationId, viewer.organizationId),
    id === undefined ? undefined : eq(table.id, id)
  );
}

/** Loads a Holder only if it belongs to the Viewer's Organization. */
export async function findHolder(viewer: Viewer, id: string) {
  const [holder] = await db
    .select()
    .from(schema.holder)
    .where(owned(schema.holder, viewer, id));
  return holder ?? notFound('Titular');
}
