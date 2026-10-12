import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { count, eq } from 'drizzle-orm';

import { focus, POMODORO_MINUTES } from '../services/focus';
import { badInput, owned, requireViewer } from './guards';
import { findTask } from './work';

export const focusResolvers: Resolvers = {
  Mutation: {
    deletePomodoro: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.pomodoro)
        .where(owned(schema.pomodoro, requireViewer(context), id))
        .returning({ id: schema.pomodoro.id });
      return deleted.length > 0;
    },
    // The server stamps the end, so a Pomodoro always lands on the day it was finished.
    logPomodoro: async (_, { minutes, taskId }, context) => {
      const viewer = requireViewer(context);
      if (minutes < POMODORO_MINUTES.min || minutes > POMODORO_MINUTES.max) {
        badInput(`Um Pomodoro tem de ${POMODORO_MINUTES.min} a ${POMODORO_MINUTES.max} minutos`);
      }
      if (taskId) await findTask(viewer, taskId);
      const [row] = await db
        .insert(schema.pomodoro)
        .values({ minutes, organizationId: viewer.organizationId, taskId: taskId ?? null })
        .returning();
      return row!;
    },
  },
  Pomodoro: {
    task: async pomodoro => {
      if (!pomodoro.taskId) return null;
      const [row] = await db.select().from(schema.task).where(eq(schema.task.id, pomodoro.taskId));
      return row ?? null;
    },
  },
  Query: {
    focus: (_, __, context) => focus(requireViewer(context).organizationId),
  },
  Task: {
    pomodoros: async task => {
      const [row] = await db
        .select({ total: count() })
        .from(schema.pomodoro)
        .where(eq(schema.pomodoro.taskId, task.id));
      return row?.total ?? 0;
    },
  },
};
