import type { Viewer } from '@zapbots/auth';
import { db, schema, type GoalWithProgressRow } from '@zapbots/database';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { day, text, title } from './clock';

export type GoalArea = (typeof schema.goalArea.enumValues)[number];
export type GoalKind = (typeof schema.goalKind.enumValues)[number];

/** A Meta as the form gives it; `target` in cents for MONEY, in units for COUNT. */
export interface GoalInput {
  area?: GoalArea | null;
  dueOn?: null | string;
  kind: GoalKind;
  target?: null | number;
  title: string;
  unit?: null | string;
}

export type GoalWithProgress = GoalWithProgressRow;

const MAX_TARGET = 1e15;

function goalValues(input: GoalInput) {
  const target = input.kind === 'CHECK' ? 1 : (input.target ?? 0);
  if (!Number.isSafeInteger(target) || target <= 0 || target > MAX_TARGET)
    badInput(
      input.kind === 'MONEY' ? 'Informe quanto quer juntar.' : 'Informe um alvo maior que zero.'
    );
  return {
    area: input.area ?? 'PERSONAL',
    dueOn: day(input.dueOn, 'O prazo'),
    kind: input.kind,
    target,
    title: title(input.title),
    unit: input.kind === 'COUNT' ? text(input.unit, 'A unidade', 30) || null : null,
  };
}

// Columns are written out with their table: Drizzle leaves them bare in a one-table query, and
// a bare `id` inside the subquery would be the Progresso's own.
const progressSum =
  sql<number>`coalesce((select sum(gp.amount) from goal_progress gp where gp.goal_id = "goal"."id"), 0)::bigint`.mapWith(
    Number
  );

export async function findGoal(viewer: Viewer, id: string): Promise<GoalWithProgress> {
  const [row] = await db
    .select({ goal: schema.goal, progress: progressSum })
    .from(schema.goal)
    .where(owned(schema.goal, viewer, id));
  if (!row) notFound('Meta');
  return { ...row.goal, progress: row.progress };
}

/** The Metas in force (or the archived ones), the nearest deadline first. */
export async function listGoals(viewer: Viewer, archived = false): Promise<GoalWithProgress[]> {
  const rows = await db
    .select({ goal: schema.goal, progress: progressSum })
    .from(schema.goal)
    .where(
      and(
        owned(schema.goal, viewer),
        archived ? isNotNull(schema.goal.archivedAt) : isNull(schema.goal.archivedAt)
      )
    )
    .orderBy(sql`${schema.goal.dueOn} asc nulls last`, asc(schema.goal.createdAt));
  return rows.map(row => ({ ...row.goal, progress: row.progress }));
}

export async function createGoal(viewer: Viewer, input: GoalInput) {
  const [row] = await db
    .insert(schema.goal)
    .values({
      ...goalValues(input),
      createdById: viewer.userId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return { ...row!, progress: 0 };
}

export async function updateGoal(viewer: Viewer, id: string, input: GoalInput) {
  await findGoal(viewer, id);
  await db
    .update(schema.goal)
    .set(goalValues(input))
    .where(owned(schema.goal, viewer, id));
  return findGoal(viewer, id);
}

export async function setGoalArchived(viewer: Viewer, id: string, archived: boolean) {
  await findGoal(viewer, id);
  await db
    .update(schema.goal)
    .set({ archivedAt: archived ? new Date() : null })
    .where(owned(schema.goal, viewer, id));
  return findGoal(viewer, id);
}

export async function deleteGoal(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.goal)
    .where(owned(schema.goal, viewer, id))
    .returning({ id: schema.goal.id });
  return deleted.length > 0;
}

/** Adds one step to a Meta (negative takes back), in its unit: cents for MONEY. */
export async function addGoalProgress(
  viewer: Viewer,
  goalId: string,
  amount: number,
  note?: null | string
) {
  await findGoal(viewer, goalId);
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_TARGET)
    badInput('Informe quanto avançou.');
  await db.insert(schema.goalProgress).values({
    amount,
    goalId,
    note: text(note, 'A nota', 200),
    organizationId: viewer.organizationId,
  });
  return findGoal(viewer, goalId);
}

export async function deleteGoalProgress(viewer: Viewer, id: string) {
  const [deleted] = await db
    .delete(schema.goalProgress)
    .where(owned(schema.goalProgress, viewer, id))
    .returning({ goalId: schema.goalProgress.goalId });
  if (!deleted) notFound('Progresso');
  return findGoal(viewer, deleted.goalId);
}

/** A Meta's Progresso, newest first. */
export function goalEntries(goalId: string) {
  return db
    .select()
    .from(schema.goalProgress)
    .where(eq(schema.goalProgress.goalId, goalId))
    .orderBy(desc(schema.goalProgress.createdAt));
}
