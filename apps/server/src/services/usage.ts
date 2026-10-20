import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { dateInMonth, today } from '@zapbots/finance';
import { and, count, eq, gte, isNotNull } from 'drizzle-orm';

/** The first instant of the current month in São Paulo, where the Users are. */
export function monthStart(): { month: string; since: Date } {
  const month = today().slice(0, 7);
  const first = dateInMonth(month, 1);
  // São Paulo has no daylight saving time since 2019: it is always UTC-3.
  return { month, since: new Date(`${first}T00:00:00-03:00`) };
}

/** What the Organization used this month: the figures the Usage page and the Plan limits read. */
export async function monthUsage(viewer: Viewer) {
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
}
