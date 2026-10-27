import type { Viewer } from '@zapbots/auth';
import { db, schema, type TaskRow } from '@zapbots/database';
import { nextOccurrence } from '@zapbots/personal';
import { and, asc, count, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { day, repeat, text, time, title } from './clock';

export type TaskPriority = (typeof schema.taskPriority.enumValues)[number];

/** A Tarefa as a form, the chat or a Proposal give it: every field, none of them checked yet. */
export interface TaskInput {
  dueOn?: null | string;
  dueTime?: null | string;
  goalId?: null | string;
  listId?: null | string;
  notes?: null | string;
  priority?: null | TaskPriority;
  /** Checked by `parseRepeat`. */
  repeat?: unknown;
  title: string;
}

/** At most this many done Tarefas come back, newest first. */
const DONE_SHOWN = 100;

async function checkList(viewer: Viewer, id: null | string | undefined) {
  if (!id) return null;
  const [row] = await db
    .select({ id: schema.taskList.id })
    .from(schema.taskList)
    .where(owned(schema.taskList, viewer, id));
  return row?.id ?? notFound('Lista');
}

async function checkGoal(viewer: Viewer, id: null | string | undefined) {
  if (!id) return null;
  const [row] = await db
    .select({ id: schema.goal.id })
    .from(schema.goal)
    .where(owned(schema.goal, viewer, id));
  return row?.id ?? notFound('Meta');
}

/** The columns of a checked Tarefa. */
export async function taskValues(viewer: Viewer, input: TaskInput) {
  const dueOn = day(input.dueOn, 'O prazo');
  const dueTime = time(input.dueTime);
  const repeats = repeat(input.repeat);
  if (dueTime && !dueOn) badInput('Escolha o dia antes da hora.');
  if (repeats && !dueOn) badInput('Uma Tarefa que se repete precisa de um dia para começar.');
  return {
    dueOn,
    dueTime,
    goalId: await checkGoal(viewer, input.goalId),
    listId: await checkList(viewer, input.listId),
    notes: text(input.notes, 'A nota', 10_000),
    priority: input.priority ?? 'NORMAL',
    repeat: repeats,
    title: title(input.title),
  };
}

export async function findTask(viewer: Viewer, id: string): Promise<TaskRow> {
  const [row] = await db
    .select()
    .from(schema.task)
    .where(owned(schema.task, viewer, id));
  return row ?? notFound('Tarefa');
}

export async function createTask(viewer: Viewer, input: TaskInput): Promise<TaskRow> {
  const [row] = await db
    .insert(schema.task)
    .values({
      ...(await taskValues(viewer, input)),
      createdById: viewer.userId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return row!;
}

export async function updateTask(viewer: Viewer, id: string, input: TaskInput): Promise<TaskRow> {
  await findTask(viewer, id);
  const [row] = await db
    .update(schema.task)
    .set(await taskValues(viewer, input))
    .where(owned(schema.task, viewer, id))
    .returning();
  return row!;
}

/**
 * Marks a Tarefa done or open again. A repeating one, once done, gives way to a new Tarefa on the
 * next date of its series; opening it again leaves that one be.
 */
export async function setTaskDone(viewer: Viewer, id: string, done: boolean): Promise<TaskRow> {
  const current = await findTask(viewer, id);
  if (Boolean(current.doneAt) === done) return current;
  return db.transaction(async tx => {
    const [row] = await tx
      .update(schema.task)
      .set({ doneAt: done ? new Date() : null })
      .where(owned(schema.task, viewer, id))
      .returning();
    if (done && current.repeat && current.dueOn) {
      const { createdAt: _, doneAt: __, id: ___, updatedAt: ____, ...rest } = current;
      await tx
        .insert(schema.task)
        .values({ ...rest, dueOn: nextOccurrence(current.dueOn, current.repeat) });
    }
    return row!;
  });
}

export async function deleteTask(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.task)
    .where(owned(schema.task, viewer, id))
    .returning({ id: schema.task.id });
  return deleted.length > 0;
}

/**
 * Open Tarefas, those with a day first (soonest, then by hour and priority), then the rest; or the
 * last done ones, newest first.
 */
export function listTasks(
  viewer: Viewer,
  {
    done = false,
    goalId,
    listId,
  }: { done?: boolean; goalId?: null | string; listId?: null | string }
): Promise<TaskRow[]> {
  const where = and(
    owned(schema.task, viewer),
    done ? isNotNull(schema.task.doneAt) : isNull(schema.task.doneAt),
    listId ? eq(schema.task.listId, listId) : undefined,
    goalId ? eq(schema.task.goalId, goalId) : undefined
  );
  const query = db.select().from(schema.task).where(where);
  if (done) return query.orderBy(desc(schema.task.doneAt)).limit(DONE_SHOWN);
  return query.orderBy(
    sql`${schema.task.dueOn} asc nulls last`,
    sql`${schema.task.dueTime} asc nulls last`,
    sql`case ${schema.task.priority} when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end`,
    asc(schema.task.createdAt)
  );
}

/** The Lists, in their order, each with how many open Tarefas it holds. */
export async function listTaskLists(viewer: Viewer) {
  const lists = await db
    .select()
    .from(schema.taskList)
    .where(owned(schema.taskList, viewer))
    .orderBy(asc(schema.taskList.position), asc(schema.taskList.createdAt));
  const counts = await db
    .select({ listId: schema.task.listId, open: count() })
    .from(schema.task)
    .where(and(owned(schema.task, viewer), isNull(schema.task.doneAt)))
    .groupBy(schema.task.listId);
  const open = new Map(counts.map(row => [row.listId, row.open]));
  return lists.map(list => ({ ...list, openCount: open.get(list.id) ?? 0 }));
}

function listName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60)
    badInput('O nome da Lista precisa ter de 1 a 60 caracteres.');
  return trimmed;
}

export async function createTaskList(viewer: Viewer, name: string) {
  const [{ position }] = (await db
    .select({ position: sql<number>`coalesce(max(${schema.taskList.position}), -1) + 1` })
    .from(schema.taskList)
    .where(owned(schema.taskList, viewer))) as [{ position: number }];
  const [row] = await db
    .insert(schema.taskList)
    .values({
      createdById: viewer.userId,
      name: listName(name),
      organizationId: viewer.organizationId,
      position,
    })
    .returning();
  return { ...row!, openCount: 0 };
}

export async function renameTaskList(viewer: Viewer, id: string, name: string) {
  const [row] = await db
    .update(schema.taskList)
    .set({ name: listName(name) })
    .where(owned(schema.taskList, viewer, id))
    .returning();
  if (!row) notFound('Lista');
  return (await listTaskLists(viewer)).find(list => list.id === id)!;
}

/** Deletes a List; its Tarefas stay, without a List. */
export async function deleteTaskList(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.taskList)
    .where(owned(schema.taskList, viewer, id))
    .returning({ id: schema.taskList.id });
  return deleted.length > 0;
}
