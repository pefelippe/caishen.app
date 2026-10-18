import { db, schema } from '@zapbots/database';
import { dateInMonth, today } from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, asc, count, eq, gte, isNotNull } from 'drizzle-orm';

import { notFound, requireViewer } from './guards';

/** The first instant of the current month in São Paulo, where the Users are. */
function monthStart(): { month: string; since: Date } {
  const month = today().slice(0, 7);
  const first = dateInMonth(month, 1);
  // São Paulo has no daylight saving time since 2019: it is always UTC-3.
  return { month, since: new Date(`${first}T00:00:00-03:00`) };
}

export const settingsResolvers: Resolvers = {
  Query: {
    organization: async (_, __, context) => {
      const viewer = requireViewer(context);
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
    },
    usage: async (_, __, context) => {
      const viewer = requireViewer(context);
      const { month, since } = monthStart();
      const inMonth = (table: typeof schema.job | typeof schema.conversation) =>
        and(eq(table.organizationId, viewer.organizationId), gte(table.createdAt, since));
      const [jobs] = await db.select({ total: count() }).from(schema.job).where(inMonth(schema.job));
      const [routineJobs] = await db
        .select({ total: count() })
        .from(schema.job)
        .where(and(inMonth(schema.job), isNotNull(schema.job.routineId)));
      const [conversations] = await db
        .select({ total: count() })
        .from(schema.conversation)
        .where(inMonth(schema.conversation));
      const [messages] = await db
        .select({ total: count() })
        .from(schema.message)
        .innerJoin(schema.conversation, eq(schema.conversation.id, schema.message.conversationId))
        .where(
          and(
            eq(schema.conversation.organizationId, viewer.organizationId),
            eq(schema.message.role, 'USER'),
            gte(schema.message.createdAt, since)
          )
        );
      return {
        conversations: conversations?.total ?? 0,
        jobs: jobs?.total ?? 0,
        messages: messages?.total ?? 0,
        month,
        routineJobs: routineJobs?.total ?? 0,
      };
    },
  },
};
