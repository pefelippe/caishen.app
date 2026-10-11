import type { Viewer } from '@mny/auth';
import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { badInput, notFound, requireViewer } from './guards';

const projectOf = (viewer: Viewer, id?: string) =>
  and(
    eq(schema.project.organizationId, viewer.organizationId),
    id ? eq(schema.project.id, id) : undefined
  );

const taskOf = (viewer: Viewer, id?: string) =>
  and(
    eq(schema.task.organizationId, viewer.organizationId),
    id ? eq(schema.task.id, id) : undefined
  );

/** Loads a Project only if it belongs to the Viewer's Organization. */
async function findProject(viewer: Viewer, id: string) {
  const [row] = await db.select().from(schema.project).where(projectOf(viewer, id));
  return row ?? notFound('Projeto');
}

/** Loads a Task only if it belongs to the Viewer's Organization. */
export async function findTask(viewer: Viewer, id: string) {
  const [row] = await db.select().from(schema.task).where(taskOf(viewer, id));
  return row ?? notFound('Tarefa');
}

export const workResolvers: Resolvers = {
  Mutation: {
    createProject: async (_, { name }, context) => {
      const viewer = requireViewer(context);
      if (!name.trim()) badInput('Dê um nome ao Projeto');
      const [row] = await db
        .insert(schema.project)
        .values({ name: name.trim(), organizationId: viewer.organizationId })
        .returning();
      return row!;
    },
    createTask: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      if (!input.title.trim()) badInput('Dê um título à Tarefa');
      if (input.projectId) await findProject(viewer, input.projectId);
      const [row] = await db
        .insert(schema.task)
        .values({
          dueOn: input.dueOn ?? null,
          organizationId: viewer.organizationId,
          projectId: input.projectId ?? null,
          title: input.title.trim(),
        })
        .returning();
      return row!;
    },
    deleteProject: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.project)
        .where(projectOf(requireViewer(context), id))
        .returning({ id: schema.project.id });
      return deleted.length > 0;
    },
    deleteTask: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.task)
        .where(taskOf(requireViewer(context), id))
        .returning({ id: schema.task.id });
      return deleted.length > 0;
    },
    updateTask: async (_, { id, input }, context) => {
      const viewer = requireViewer(context);
      await findTask(viewer, id);
      if (input.projectId) await findProject(viewer, input.projectId);
      if (input.title != null && !input.title.trim()) badInput('Dê um título à Tarefa');
      const [row] = await db
        .update(schema.task)
        .set({
          // `undefined` leaves the column alone; an explicit null clears it.
          dueOn: input.dueOn,
          projectId: input.projectId,
          status: input.status ?? undefined,
          title: input.title?.trim(),
        })
        .where(taskOf(viewer, id))
        .returning();
      return row!;
    },
  },
  Query: {
    projects: (_, __, context) =>
      db
        .select()
        .from(schema.project)
        .where(projectOf(requireViewer(context)))
        .orderBy(asc(schema.project.name)),
    // Open Tasks first, soonest deadline on top; done Tasks last, most recent first.
    tasks: (_, __, context) =>
      db
        .select()
        .from(schema.task)
        .where(taskOf(requireViewer(context)))
        .orderBy(
          sql`${schema.task.status} = 'DONE'`,
          sql`${schema.task.dueOn} asc nulls last`,
          desc(schema.task.createdAt)
        ),
  },
  Task: {
    attachments: task =>
      db.select().from(schema.attachment).where(eq(schema.attachment.taskId, task.id)),
    project: async task => {
      if (!task.projectId) return null;
      const [row] = await db
        .select()
        .from(schema.project)
        .where(eq(schema.project.id, task.projectId));
      return row ?? null;
    },
  },
};
