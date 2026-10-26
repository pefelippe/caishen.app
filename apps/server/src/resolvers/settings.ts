import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, asc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

import { AccountError, deleteAccount } from '../services/account';
import { StripeError } from '../services/billing/stripe';
import { monthUsage } from '../services/usage';
import { badInput, notFound, requireViewer } from './guards';

/** The Viewer's Organization with its Members, oldest first. */
async function loadOrganization(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, viewer.organizationId));
  if (!row) notFound('Organização');
  const members = await db
    .select({
      email: schema.user.email,
      id: schema.member.id,
      joinedAt: schema.member.createdAt,
      name: schema.user.name,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(eq(schema.member.organizationId, viewer.organizationId))
    .orderBy(asc(schema.member.createdAt));
  return { createdAt: row.createdAt, id: row.id, members, name: row.name };
}

/** Only an `owner` or `admin` changes the Organization's settings. */
export async function requireAdmin(viewer: Viewer): Promise<void> {
  const [row] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, viewer.organizationId),
        eq(schema.member.userId, viewer.userId)
      )
    );
  if (row?.role !== 'owner' && row?.role !== 'admin') {
    throw new GraphQLError('Só administradores mudam a Organização', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

export const settingsResolvers: Resolvers = {
  Mutation: {
    deleteAccount: async (_, { confirm }, context) => {
      const viewer = requireViewer(context);
      try {
        await deleteAccount(viewer, confirm);
      } catch (error) {
        if (error instanceof AccountError || error instanceof StripeError) badInput(error.message);
        throw error;
      }
      return true;
    },
    renameOrganization: async (_, { name }, context) => {
      const viewer = requireViewer(context);
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80) badInput('O nome precisa ter de 1 a 80 caracteres.');
      await requireAdmin(viewer);
      await db
        .update(schema.organization)
        .set({ name: trimmed })
        .where(eq(schema.organization.id, viewer.organizationId));
      return loadOrganization(viewer);
    },
  },
  Query: {
    organization: (_, __, context) => loadOrganization(requireViewer(context)),
    usage: (_, __, context) => monthUsage(requireViewer(context)),
  },
};
